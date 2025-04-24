import { ConflictException, Injectable } from '@nestjs/common';

import * as nodemailer from "nodemailer"

@Injectable()
export class NodemailerService {
private transporter : nodemailer.Transporter;
constructor(){
    this.transporter= nodemailer.createTransport({
       service:"gmail",
        auth: {
          user: "hogwarts.back.henry@gmail.com",
          pass: "bwxm wlhe ndil dnsq",
        },
    })
}
async sendEmail(email:string,urlOrder:string){
    try {
        const info = await this.transporter.sendMail({
            from: '"SaphireSouvenirs 👻"hogwarts.back.henry@gmail.com', // sender address
            to: email, // list of receivers
            subject: "Hello ✔", // Subject line
            text: "Hello world?", // plain text body
            html: `
            <html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="telephone=no" name="format-detection">
    <title></title>
    <!--[if (mso 16)]>
    <style type="text/css">
    a {text-decoration: none;}
    </style>
    <![endif]-->
    <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]-->
    <!--[if gte mso 9]>
<noscript>
         <xml>
           <o:OfficeDocumentSettings>
           <o:AllowPNG></o:AllowPNG>
           <o:PixelsPerInch>96</o:PixelsPerInch>
           </o:OfficeDocumentSettings>
         </xml>
      </noscript>
<![endif]-->
    <!--[if mso]><xml>
    <w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word">
      <w:DontUseAdvancedTypographyReadingMail/>
    </w:WordDocument>
    </xml><![endif]-->
  </head>
  <body class="body">
    <div dir="ltr" class="es-wrapper-color">
      <!--[if gte mso 9]>
			<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
				<v:fill type="tile" color="#fafafa"></v:fill>
			</v:background>
		<![endif]-->
      <table width="100%" cellspacing="0" cellpadding="0" class="es-wrapper">
        <tbody>
          <tr>
            <td valign="top" class="esd-email-paddings">
              <table cellpadding="0" cellspacing="0" align="center" class="es-content esd-header-popover">
                <tbody></tbody>
              </table>
              <table cellpadding="0" cellspacing="0" align="center" class="es-header">
                <tbody></tbody>
              </table>
              <table cellpadding="0" cellspacing="0" align="center" class="es-content">
                <tbody>
                  <tr>
                    <td align="center" class="esd-stripe">
                      <table bgcolor="#ffffff" align="center" cellpadding="0" cellspacing="0" width="600" class="es-content-body">
                        <tbody>
                          <tr>
                            <td align="left" class="esd-structure es-p15t es-p20r es-p20l">
                              <table cellpadding="0" cellspacing="0" width="100%">
                                <tbody>
                                  <tr>
                                    <td width="560" align="center" valign="top" class="esd-container-frame">
                                      <table cellpadding="0" cellspacing="0" width="100%">
                                        <tbody>
                                          <tr>
                                            <td align="center" class="esd-block-image es-p10t es-p10b" style="font-size:0px">
                                              <a target="_blank">
                                                <img src="https://euzpoij.stripocdn.email/content/guids/CABINET_54100624d621728c49155116bef5e07d/images/84141618400759579.png" alt="" width="100" style="display:block">
                                              </a>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="center" class="esd-block-text es-p10b">
                                              <h1 class="es-m-txt-c" style="font-size:46px;line-height:100%">
                                                Confirmacion de Pedido
                                              </h1>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table cellpadding="0" cellspacing="0" align="center" class="es-content">
                <tbody>
                  <tr>
                    <td align="center" class="esd-stripe">
                      <table bgcolor="#ffffff" align="center" cellpadding="0" cellspacing="0" width="600" class="es-content-body">
                        <tbody>
                          <tr>
                            <td align="left" class="esd-structure es-p20">
                              <table cellpadding="0" cellspacing="0" width="100%">
                                <tbody>
                                  <tr>
                                    <td width="560" align="center" valign="top" class="esd-container-frame">
                                      <table cellpadding="0" cellspacing="0" width="100%">
                                        <tbody>
                                          <tr>
                                            <td align="center" class="esd-block-text">
                                              <h2 class="es-m-txt-c">
                                                Orden <a target="_blank">#65000500</a>
                                              </h2>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="center" class="esd-block-text es-p5t es-p15b es-p40r es-p40l es-m-p0r es-m-p0l">
                                              <p>
                                                Este correo electrónico es para confirmar su pedido
                                              </p>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td align="center" class="esd-block-button">
                                              <span class="es-button-border" style="border-radius:6px;border-color:#5c68e2;border-width:2px;background:#5c68e2">
                                                <a href="" target="_blank" class="es-button" style="border-left-width:30px;border-right-width:30px;border-radius:6px">
                                                  Detalle de Orden
                                                </a>
                                              </span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td align="left" class="esd-structure es-p10t es-p10b es-p20r es-p20l esdev-adapt-off">
                              <table width="560" cellpadding="0" cellspacing="0" class="esdev-mso-table">
                                <tbody>
                                  <tr>
                                    <td valign="top" class="esdev-mso-td">
                                      <table cellpadding="0" cellspacing="0" align="left" class="es-left">
                                        <tbody>
                                          <tr>
                                            <td width="70" align="center" class="es-m-p0r esd-container-frame">
                                              <table cellpadding="0" cellspacing="0" width="100%">
                                                <tbody>
                                                  <tr>
                                                    <td align="center" class="esd-block-image" style="font-size:0px">
                                                      <a target="_blank">
                                                        <img src="https://euzpoij.stripocdn.email/content/guids/CABINET_c67048fd0acf81b47e18129166337c05/images/79021618299486570.png" alt="" width="70" class="adapt-img" style="display:block">
                                                      </a>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                    <td width="20"></td>
                                    <td valign="top" class="esdev-mso-td">
                                      <table cellpadding="0" cellspacing="0" align="left" class="es-left">
                                        <tbody>
                                          <tr>
                                            <td width="265" align="center" class="esd-container-frame">
                                              <table cellpadding="0" cellspacing="0" width="100%">
                                                <tbody>
                                                  <tr>
                                                    <td align="left" class="esd-block-text">
                                                      <p>
                                                        <strong>Polo</strong>
                                                      </p>
                                                    </td>
                                                  </tr>
                                                  <tr>
                                                    <td align="left" class="esd-block-text es-p5t">
                                                      <p>
                                                        Size: M<br>Color: White
                                                      </p>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                    <td width="20"></td>
                                    <td valign="top" class="esdev-mso-td">
                                      <table cellpadding="0" cellspacing="0" align="left" class="es-left">
                                        <tbody>
                                          <tr>
                                            <td width="80" align="left" class="esd-container-frame">
                                              <table cellpadding="0" cellspacing="0" width="100%">
                                                <tbody>
                                                  <tr>
                                                    <td align="center" class="esd-block-text">
                                                      <p>
                                                        2 pcs
                                                      </p>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                    <td width="20"></td>
                                    <td valign="top" class="esdev-mso-td">
                                      <table cellpadding="0" cellspacing="0" align="right" class="es-right">
                                        <tbody>
                                          <tr>
                                            <td width="85" align="left" class="esd-container-frame">
                                              <table cellpadding="0" cellspacing="0" width="100%">
                                                <tbody>
                                                  <tr>
                                                    <td align="right" class="esd-block-text">
                                                      <p>
                                                        $20
                                                      </p>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td align="left" class="esd-structure es-p10t es-p10b es-p20r es-p20l esdev-adapt-off">
                              <table width="560" cellpadding="0" cellspacing="0" class="esdev-mso-table">
                                <tbody>
                                  <tr>
                                    <td valign="top" class="esdev-mso-td">
                                      <table cellpadding="0" cellspacing="0" align="left" class="es-left">
                                        <tbody>
                                          <tr>
                                            <td width="70" align="center" class="es-m-p0r esd-container-frame">
                                              <table cellpadding="0" cellspacing="0" width="100%">
                                                <tbody>
                                                  <tr>
                                                    <td align="center" class="esd-block-image" style="font-size:0px">
                                                      <a target="_blank">
                                                        <img src="https://euzpoij.stripocdn.email/content/guids/CABINET_c67048fd0acf81b47e18129166337c05/images/43961618299486640.png" alt="" width="70" class="adapt-img" style="display:block">
                                                      </a>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                    <td width="20"></td>
                                    <td valign="top" class="esdev-mso-td">
                                      <table cellpadding="0" cellspacing="0" align="left" class="es-left">
                                        <tbody>
                                          <tr>
                                            <td width="265" align="center" class="esd-container-frame">
                                              <table cellpadding="0" cellspacing="0" width="100%">
                                                <tbody>
                                                  <tr>
                                                    <td align="left" class="esd-block-text">
                                                      <p>
                                                        <strong>T-shirt</strong>
                                                      </p>
                                                    </td>
                                                  </tr>
                                                  <tr>
                                                    <td align="left" class="esd-block-text es-p5t">
                                                      <p>
                                                        Size: M<br>Color: White
                                                      </p>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                    <td width="20"></td>
                                    <td valign="top" class="esdev-mso-td">
                                      <table cellpadding="0" cellspacing="0" align="left" class="es-left">
                                        <tbody>
                                          <tr>
                                            <td width="80" align="left" class="esd-container-frame">
                                              <table cellpadding="0" cellspacing="0" width="100%">
                                                <tbody>
                                                  <tr>
                                                    <td align="center" class="esd-block-text">
                                                      <p>
                                                        1 pcs
                                                      </p>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                    <td width="20"></td>
                                    <td valign="top" class="esdev-mso-td">
                                      <table cellpadding="0" cellspacing="0" align="right" class="es-right">
                                        <tbody>
                                          <tr>
                                            <td width="85" align="left" class="esd-container-frame">
                                              <table cellpadding="0" cellspacing="0" width="100%">
                                                <tbody>
                                                  <tr>
                                                    <td align="right" class="esd-block-text">
                                                      <p>
                                                        $20
                                                      </p>
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td align="left" class="esd-structure es-p10t es-p20r es-p20l">
                              <table cellpadding="0" cellspacing="0" width="100%">
                                <tbody>
                                  <tr>
                                    <td width="560" align="center" class="es-m-p0r esd-container-frame">
                                      <table cellpadding="0" cellspacing="0" width="100%" style="border-top:2px solid #efefef;border-bottom:2px solid #efefef">
                                        <tbody>
                                          <tr>
                                            <td align="right" class="esd-block-text es-p10t es-p20b">
                                              <p class="es-m-txt-r">
                                                Subtotal:&nbsp;<strong>$40.00</strong><br>Shipping:&nbsp;<strong>$0.00</strong><br>Tax:&nbsp;<strong>$10.00</strong><br>Total:&nbsp;<strong>$50.00</strong>
                                              </p>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table cellpadding="0" cellspacing="0" align="center" class="es-footer">
                <tbody>
                  <tr>
                    <td align="center" class="esd-stripe">
                      <table align="center" cellpadding="0" cellspacing="0" width="640" class="es-footer-body" style="background-color:transparent">
                        <tbody>
                          <tr>
                            <td align="left" class="esd-structure es-p20t es-p20b es-p20r es-p20l">
                              <table cellpadding="0" cellspacing="0" width="100%">
                                <tbody>
                                  <tr>
                                    <td width="600" align="left" class="esd-container-frame">
                                      <table cellpadding="0" cellspacing="0" width="100%">
                                        <tbody>
                                          <tr>
                                            <td align="center" class="esd-block-text es-p35b">
                                              <p>
                                                SaphireSouvenirs
                                              </p>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table cellpadding="0" cellspacing="0" align="center" class="es-content esd-footer-popover">
                <tbody>
                  <tr>
                    <td align="center" class="esd-stripe">
                      <table align="center" cellpadding="0" cellspacing="0" width="600" bgcolor="rgba(0, 0, 0, 0)" class="es-content-body" style="background-color:transparent">
                        <tbody>
                          <tr>
                            <td align="left" class="esd-structure es-p20">
                              <table cellpadding="0" cellspacing="0" width="100%">
                                <tbody>
                                  <tr>
                                    <td width="560" align="center" valign="top" class="esd-container-frame">
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
</html>
            `

            , // html body
          });
          //
          //<b>Compra realizada</b>
          //<b> ${urlOrder} </b>
           
          console.log("Message sent: %s", info.messageId);      
          return info   
    } catch (error) {
        console.error('Error sending email:', error);
        throw new ConflictException('Error sending email');
      }   
    }


    
}
