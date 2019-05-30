require('dotenv').config()
const docusign = require('docusign-esign');
const redis = require('redis')

const apiClient = new docusign.ApiClient();
const client = redis.createClient()
let attempt = 1

const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

const basePath = process.env.DOCUSIGN_BASE_PATH;

apiClient.setBasePath(basePath);

let token = null;

function initialize(callback) {
  client.get('ds_token', function(err, reply) {
    if(reply == null){
      robot()
    }else{
      requestDocusign(JSON.parse(reply), (err, res) => {
        if(res.email != process.env.DOCUSIGN_LOGIN){
          robot()
        }else{
          callback(null, JSON.parse(reply).accessToken)
        }
      })
    }
  });
}

function requestDocusign(oAuthToken, callback_request){
  client.set('ds_token', JSON.stringify(oAuthToken))
  apiClient.addDefaultHeader('Authorization', 'Bearer ' + oAuthToken.accessToken);
  apiClient.getUserInfo(oAuthToken.accessToken)
  .then(function (userInfo) {
    apiClient.setBasePath(userInfo.accounts[0].baseUri + "/restapi");
    callback_request(null, userInfo)
  })
  .catch(function (error) {
    if(error)
      throw error;
   });
}

function robot() {
  if(attempt > 10)
    return
  console.log("tentativa: "+attempt);
  const Browser = require('zombie')
  const browser = new Browser({
    maxWait: 10000,
    loadCSS: false
  });
  browser.visit(`http://${host}:${port}/getToken`, () => {
    console.log(browser);
    if(browser.text().includes("email")){
      console.warn("page e-mail: "+ browser.text())
      browser.pressButton('Continue', () => {
        if(browser.text().includes("password")){
          console.warn("page password: "+ browser.text())
          browser.fill("password", process.env.DOCUSIGN_PASSWORD)
          browser.pressButton('Log in', () => {
            if(JSON.parse(browser.text()).email == process.env.DOCUSIGN_LOGIN){
              console.log("token docusign atualizada");
              return
            }else{
              console.error("token não pertence a conta");
              attempt++
              robot()
            }
          });
        }else{
          console.error("campo password nao encontrado");
          attempt++
          robot()
        }
      })
    }else{
      console.error("campo email nao encontrado");
      attempt++
      robot()
    }
  })
}

module.exports = { initialize, requestDocusign, robot }
