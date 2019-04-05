/// Importaciones
const express = require('express')
const ldap = require('ldapjs')
const bp = require('body-parser')
const mailer = require('nodemailer')

/// Configuraciones e inicializaciones
const app = express()
app.set('view engine', 'pug')
app.use(bp.json())
app.use(bp.urlencoded({ extended: true }))

//  Configuraciones e inicializaciones para LDAP
let ldapConfig = {
    "server": {
        "url": "ldap://192.168.50.211:389"
    },
    "base": "ou=people,o=computes nodes,o=leftraru,dc=leftraru,dc=nlhpc,dc=cl",
    "search_options": {
        "filter": "(uid=*)",
        "scope": "sub",
        "attributes": ["givenName", "homePostalAddress"]
    }
}
let ldap_client = ldap.createClient(ldapConfig.server)

//  Configuraciones para correo SMTP
var mailConfig = {
    "host": 'zimbra.nlhpc.cl',
    "secure": true,
    "tls": {
        "rejectUnauthorized": false
    }
}

//  Definición de rutas y acciones
app.get('/', (request, result) => {
    result.render('index')
})

app.post('/', (request, result) => {
    mailConfig.auth = {
        user: request.body.usuario,
        pass: request.body.password
    }

    let mail_transporter = mailer.createTransport(mailConfig)
    mail_transporter.verify((error_transporter, success_transporter) => {
        if (error_transporter) {
            result.json({"status_ok": false})
        } else {
            ldap_client.search(ldapConfig.base, ldapConfig.search_options, (error_ldap_client, response_ldap_client) => {
                response_ldap_client.on('searchEntry', usuario => {
                    let correo = {
                        from: '"Soporte NLHPC" <soporte@nlhpc.cl>',
                        to: usuario.object.homePostalAddress,
                        subject: request.body.asunto,
                        html: request.body.html
                    }

                    mail_transporter.sendMail(correo, (error_sending_mail, info_mail) => {
                        console.log(error_sending_mail || ('Mensaje %s enviado %s', info_mail.messageId, info_mail.response))
                        result.json({"status_ok": !error_sending_mail})
                    })
                })
            })
        }
    })
})

// Inicialización de servidor web
const port = process.env.PORT || 3000;
app.listen(port, err => console.log(err || `Servidor corriendo en puerto ${port}`))
