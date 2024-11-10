const awsServerlessExpress = require('aws-serverless-express');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const fetch = require('node-fetch');
const e = require('express');
require('dotenv').config();
require('aws-sdk/lib/maintenance_mode_message').suppress = true;

const PORT = process.env.PORT || 3000;
const ses = new AWS.SES({ apiVersion: '2010-12-01' });
const app = express();

AWS.config.update({
    // accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    // secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/send', async (req, res) => {
    console.log('Received request to /send');
    const { captchaResponse, lastname, name, visitorEmail, phone, message } = req.body;
    if (!lastname || !name || !visitorEmail || !phone || !message) {
        return res.status(400).send('Tous les champs doivent être remplis.');
    }
    // Verify the reCAPTCHA token
    try {
        const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaResponse}`, {
            method: 'POST',
        });
        const data = await response.json();
        console.log('CAPTCHA verification response:', data);

        if (!data.success || data.score < 0.5) {
            return res.status(400).send('La vérification du CAPTCHA a échoué.');
        }
    } catch (error) {
        console.error('Error verifying CAPTCHA:', error);
        return res.status(500).send('Erreur lors de la vérification du CAPTCHA.');
    }

    // Prepare email parameters
    const contactEmail = process.env.CONTACT_EMAIL;
    const porteurAffaireEmail = process.env.PORTAFF_EMAIL;
    const params = {
        Destination: {
            ToAddresses: [visitorEmail, contactEmail, porteurAffaireEmail],
        },
        Message: {
            Body: {
                Text: {
                    Data: `Nom: ${lastname}\nPrénom: ${name}\nEmail: ${visitorEmail}\nTéléphone: ${phone}\n\nMessage:\n${message}`,
                },
            },
            Subject: {
                Data: 'CASTOR COUVERTURE | Nouveau message de contact',
            },},
        Source: process.env.EMAIL_SOURCE,
    };

    // Send email
    try {
        const emailResponse = await ses.sendEmail(params).promise();
        console.log('Message envoyé avec succès:', emailResponse);
        res.status(200).json({ success: true, message: 'Message envoyé avec succès.' });
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email: ', error);
        return res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de l\'email.' });
    }
});

// dev
//
// app.listen(PORT, () => {console.log(`Server is running on http://localhost:${PORT}`);});

// lambda
//
const server = awsServerlessExpress.createServer(app);
exports.handler = (event, context) => { awsServerlessExpress.proxy(server, event, context); };
