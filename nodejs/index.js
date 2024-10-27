const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

require('aws-sdk/lib/maintenance_mode_message').suppress = true;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

AWS.config.update({ region: process.env.AWS_REGION });

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

app.post('/send', (req, res) => {
    const { lastname, name, email, phone, message } = req.body;

    const params = {
        Destination: {
            ToAddresses: [process.env.EMAILTO],
        },
        Message: {
            Body: {
                Text: {
                    Data: `Nom: ${lastname}\nPrénom: ${name}\nEmail: ${email}\nTéléphone: ${phone}\n\nMessage:\n${message}`,
                },
            },
            Subject: {
                Data: 'ACRENOVATION | Nouveau message de contact',
            },
        },
        Source: process.env.EMAILFROM,
    };

    ses.sendEmail(params, (error, data) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send(error.message);
        }
        console.log('Email sent successfully:', data);
        res.status(200).send('Message envoyé avec succès.');
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
