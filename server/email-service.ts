import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("⚠️ SENDGRID_API_KEY not found - email notifications will be disabled");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface OrderConfirmationEmailParams {
  customerEmail: string;
  orderId: string;
  productType: string;
  stlFileUrl: string;
  engravingText?: string;
}

export async function sendOrderConfirmationEmail(params: OrderConfirmationEmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("⚠️ SendGrid API key not configured - skipping email notification");
    return false;
  }

  try {
    const { customerEmail, orderId, productType, stlFileUrl, engravingText } = params;
    
    // Format product type for display
    const formattedProductType = productType
      .replace('_', ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    // Create email content
    const subject = `Your 3D Print Order is Ready! - Order ${orderId.substring(0, 8)}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Formily</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .order-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #007bff;">🎉 Your Order is Ready!</h1>
            <p style="margin: 10px 0 0 0;">Order #${orderId.substring(0, 8)}</p>
          </div>
          
          <div class="content">
            <h2>Great news!</h2>
            <p>Your custom 3D print order has been completed and dispatched to our print partner. Your ${formattedProductType} is now in production!</p>
            
            <div class="order-details">
              <h3>Order Details:</h3>
              <ul>
                <li><strong>Product Type:</strong> ${formattedProductType}</li>
                <li><strong>Order ID:</strong> ${orderId}</li>
                ${engravingText ? `<li><strong>Engraving:</strong> "${engravingText}"</li>` : ''}
                <li><strong>Status:</strong> Dispatched to Print Partner</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${stlFileUrl}" class="button" target="_blank">📥 Download Your STL File</a>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ol>
              <li>Our print partner will begin 3D printing your custom item</li>
              <li>Quality control and finishing touches will be applied</li>
              <li>Your order will be shipped directly to you</li>
              <li>You'll receive tracking information once shipped</li>
            </ol>
            
            <p>Your STL file download link will remain active for 14 days. We recommend downloading and saving your file for future use.</p>
            
            <p>Thank you for choosing Formily for your custom 3D printing needs!</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Formily.<br>
            If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
Your 3D Print Order is Ready! - Order ${orderId.substring(0, 8)}

Great news! Your custom 3D print order has been completed and dispatched to our print partner.

Order Details:
- Product Type: ${formattedProductType}
- Order ID: ${orderId}
${engravingText ? `- Engraving: "${engravingText}"` : ''}
- Status: Dispatched to Print Partner

Download your STL file: ${stlFileUrl}

What happens next?
1. Our print partner will begin 3D printing your custom item
2. Quality control and finishing touches will be applied
3. Your order will be shipped directly to you
4. You'll receive tracking information once shipped

Your STL file download link will remain active for 14 days.

Thank you for choosing Formily for your custom 3D printing needs!
    `;

    await mailService.send({
      to: customerEmail,
      from: 'orders@formily.com', // Replace with your verified sender email
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ Order confirmation email sent to ${customerEmail} for order ${orderId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send order confirmation email:', error);
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    return false;
  }
}

export async function testEmailConfiguration(): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("⚠️ SendGrid API key not configured");
    return false;
  }

  try {
    // Test email configuration without sending
    console.log("✅ SendGrid API key is configured");
    return true;
  } catch (error: any) {
    console.error('❌ Email configuration test failed:', error);
    return false;
  }
}