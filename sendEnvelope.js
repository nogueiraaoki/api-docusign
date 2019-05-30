require('dotenv').config()
const docusign = require('docusign-esign');
const redis = require('redis')
const fs = require('fs')
const path = require('path')
const basePath = 'https://demo.docusign.net/restapi'

const apiClient = new docusign.ApiClient();
const client = redis.createClient()

const testInvestimento = {
  id: 1,
  Plano: {
    id: 1,
    nome: "BTCM 180"
  },
  Assinaturas: [
    {
      id: 1,
      nome: "Cliente",
      email: "nogueiraaoki@gmail.com",
      posicaoX: 280,
      posicaoY: 240,
      pagina: 6,
      TipoAssinatura: {
        id: 1,
        nome: "Cliente"
      }
    },
    {
      id: 2,
      nome: "Contratante",
      email: "nogueiraaoki@gmail.com",
      posicaoX: 157,
      posicaoY: 335,
      pagina: 6,
      TipoAssinatura: {
        id: 2,
        nome: "Contratante"
      }
    },
    {
      id: 3,
      nome: "Contratado",
      email: "nogueiraaoki@gmail.com",
      posicaoX: 392,
      posicaoY: 335,
      pagina: 6,
      TipoAssinatura: {
        id: 3,
        nome: "Contratado"
      }
    },
    {
      id: 4,
      nome: "Testemunha 1",
      email: "nogueiraaoki@gmail.com",
      posicaoX: 157,
      posicaoY: 440,
      pagina: 6,
      TipoAssinatura: {
        id: 4,
        nome: "Testemunha"
      }
    },
    {
      id: 5,
      nome: "Testemunha 2",
      email: "nogueiraaoki@gmail.com",
      posicaoX: 392,
      posicaoY: 440,
      pagina: 6,
      TipoAssinatura: {
        id: 4,
        nome: "Testemunha"
      }
    }
  ]
}

async function send(accessToken){
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const fileName = 'modelo.pdf';

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(basePath);
  apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
  docusign.Configuration.default.setDefaultApiClient(apiClient);

  const envDef = new docusign.EnvelopeDefinition();
  envDef.emailSubject = 'Por favor, assine o documento referente ao Plano contratado: '+testInvestimento.Plano.nome;
  envDef.emailBlurb = 'Por favor, assine o documento referente ao Plano contratado: '+testInvestimento.Plano.nome;

  const pdfBytes = fs.readFileSync(path.resolve(__dirname, fileName))
      , pdfBase64 = pdfBytes.toString('base64');

  const doc = docusign.Document.constructFromObject({documentBase64: pdfBase64,
        fileExtension: 'pdf',
        name: 'Contrato: '+testInvestimento.Plano.nome, documentId: testInvestimento.id});

  envDef.documents = [doc];

  let signers = []
  testInvestimento.Assinaturas.forEach((assinatura, i) => {
    const signer = docusign.Signer.constructFromObject({name: assinatura.nome,
      email: assinatura.email, routingOrder: '1', recipientId: i+1});
    const signHere = docusign.SignHere.constructFromObject({documentId: testInvestimento.id,
      pageNumber: assinatura.pagina, recipientId: i+1, tabLabel: 'SignHereTab',
      xPosition: assinatura.posicaoX, yPosition: assinatura.posicaoY});
    signer.tabs = docusign.Tabs.constructFromObject({signHereTabs: [signHere]});

    signers.push(signer)
  })

  envDef.recipients = docusign.Recipients.constructFromObject({signers: signers });
  envDef.status = 'sent';

  let envelopesApi = new docusign.EnvelopesApi(),
      results
  try {
    results = await envelopesApi.createEnvelope(accountId, {'envelopeDefinition': envDef})
  } catch  (e) {
    let body = e.response && e.response.body;
    if (body) {
      console.log(JSON.stringify(body, null, 4));
    } else {
      throw e;
    }
  }
  if (results) {
    console.log(JSON.stringify(results, null, 4))
  }
}

module.exports = { send }
