require('dotenv').config()
const express = require('express');
const docusign = require('docusign-esign');
const { initialize, requestDocusign, robot } = require("./docusign")
const { send } = require("./sendEnvelope")

const apiClient = new docusign.ApiClient();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

const integratorKey = process.env.DOCUSIGN_CLIENT_ID;
const clientSecret = process.env.DOCUSIGN_CLIENT_SECRET;
const redirectUri = process.env.DOCUSIGN_REDIRECT_URI;
const basePath = process.env.DOCUSIGN_BASE_PATH;

const responseType = apiClient.OAuth.ResponseType.CODE;
const scopes = [apiClient.OAuth.Scope.SIGNATURE];
const randomState = "*^.$DGj*)+}Jk";

let accessToken = null

apiClient.setBasePath(basePath);

app.get('/getToken', function (req, res) {
    const authUri = apiClient.getAuthorizationUri(integratorKey, scopes, redirectUri, responseType, randomState);
    res.redirect(authUri);
});

app.get('/callback_docusign', function (req, res) {
  apiClient.generateAccessToken(integratorKey, clientSecret, req.query.code)
  .then(function (oAuthToken) {
    requestDocusign(oAuthToken, (err, response) => {
      res.send(oAuthToken.accessToken);
      accessToken = oAuthToken.accessToken
    });
  })
  .catch(function (error) {
     if(error)
       throw error;
   });
});

app.get('/send', (req, res) => {
  res.send("send docusign")
  initialize((err, result) => {
    send(result)
  })
})

app.listen(port, host, function (error) {
  if (error)
    throw error;
  console.log('Your server is running on http://' + host + ':' + port + '.');
});
