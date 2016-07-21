'use strict';

const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fetch = require('node-fetch');
const request = require('request');
const apiai = require('apiai');

// Webserver parameter
 const PORT = process.env.PORT || 8445;

// Messenger API parameters
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN | "12345";
if (!FB_PAGE_TOKEN) { throw new Error('missing FB_PAGE_TOKEN') }

var api = apiai("d5f0ecf21198463bb95039342a21f8e2");

// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

const fbMessage = (id, text) => {
  const body = JSON.stringify({
    recipient: { id },
    message: { text },
  });
  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};
//
// // ----------------------------------------------------------------------------
// // Wit.ai bot specific code
//
// // This will contain all user sessions.
// // Each session has an entry:
// // sessionId -> {fbid: facebookUserId, context: sessionState}
// const sessions = {};
//
// const findOrCreateSession = (fbid) => {
//   let sessionId;
//   // Let's see if we already have a session for the user fbid
//   Object.keys(sessions).forEach(k => {
//     if (sessions[k].fbid === fbid) {
//       // Yep, got it!
//       sessionId = k;
//     }
//   });
//   if (!sessionId) {
//     // No session found for user fbid, let's create a new one
//     sessionId = new Date().toISOString();
//     sessions[sessionId] = {fbid: fbid, context: {}};
//   }
//   return sessionId;
// };

// Starting our webserver and putting it all together
const app = express();
// app.use(({method, url}, rsp, next) => {
//   rsp.on('finish', () => {
//     console.log(`${rsp.statusCode} ${method} ${url}`);
//   });
//   next();
// });
app.use(bodyParser.json());

// Webhook setup
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === "open_says_me") {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

// Message handler
app.post('/webhook', (req, res) => {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference

  if(!req.body) {
      throw new Error("there wasn't a body");
  }


  const data = req.body;

  if (data.object === 'page') {
    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
        if (event.message) {


          var rr = api.textRequest(event.message);

          rr.on('response', function(response) {
            fbMessage(event.sender.id, response.result.fulfillment.speech)
          });

          rr.on('error', function(error) {
            console.log(error);
          });

          rr.end();


        //   // Yay! We got a new message!
        //   // We retrieve the Facebook user ID of the sender
        //   const sender = event.sender.id;
        //
        //   // We retrieve the user's current session, or create one if it doesn't exist
        //   // This is needed for our bot to figure out the conversation history
        //   const sessionId = findOrCreateSession(sender);
        //
        //   // We retrieve the message content
        //   const {text, attachments} = event.message;
        //
        //   if (attachments) {
        //     // We received an attachment
        //     // Let's reply with an automatic message
        //     fbMessage(sender, 'Sorry I can only process text messages for now.')
        //     .catch(console.error);
        //   } else if (text) {
        //     // We received a text message
        //
        //     // Let's forward the message to the Wit.ai Bot Engine
        //     // This will run all actions until our bot has nothing left to do
        //     wit.runActions(
        //       sessionId, // the user's current session
        //       text, // the user's message
        //       sessions[sessionId].context // the user's current session state
        //     ).then((context) => {
        //       // Our bot did everything it has to do.
        //       // Now it's waiting for further messages to proceed.
        //       console.log('Waiting for next user messages');
        //
        //       // Based on the session state, you might want to reset the session.
        //       // This depends heavily on the business logic of your bot.
        //       // Example:
        //       // if (context['done']) {
        //       //   delete sessions[sessionId];
        //       // }
        //
        //       // Updating the user's current session state
        //       sessions[sessionId].context = context;
        //     })
        //     .catch((err) => {
        //       console.error('Oops! Got an error from Wit: ', err.stack || err);
        //     })
        //   }
        // } else {
        //   console.log('received event', JSON.stringify(event));
         }
      });
    });
  }
  res.sendStatus(200);
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
// function verifyRequestSignature(req, res, buf) {
//   var signature = req.headers["x-hub-signature"];

//   if (!signature) {
//     // For testing, let's log an error. In production, you should throw an
//     // error.
//     console.error("Couldn't validate the signature.");
//   } else {
//     var elements = signature.split('=');
//     var method = elements[0];
//     var signatureHash = elements[1];

//     var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
//                         .update(buf)
//                         .digest('hex');

//     if (signatureHash != expectedHash) {
//       throw new Error("Couldn't validate the request signature.");
//     }
//   }
// }
//
app.listen(PORT);
console.log('Listening on :' + PORT + '...');
