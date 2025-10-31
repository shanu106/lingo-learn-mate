import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

Deno.serve(async (req) => {
  console.log('Send email function invoked')
  
  if (req.method !== 'POST') {
    console.error('Invalid method:', req.method)
    return new Response('Method not allowed', { status: 400 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecret)
  
  try {
    console.log('Verifying webhook payload')
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    console.log('Building verification link for:', user.email)
    const verificationUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; margin: 0 auto;">
                  <tr>
                    <td style="padding: 40px;">
                      <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">
                        Welcome to LingoLearnMate! 🎓
                      </h1>
                      
                      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 0 0 30px 0;">
                        Thank you for signing up! Please verify your email address to get started with your learning journey.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${verificationUrl}" style="background-color: #8B5CF6; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; padding: 12px 32px; text-decoration: none;">
                              Verify Email Address
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #333; font-size: 16px; line-height: 26px; margin: 20px 0 10px 0;">
                        Or copy and paste this verification code:
                      </p>
                      
                      <div style="background-color: #f4f4f4; border: 1px solid #eee; border-radius: 5px; color: #333; font-family: monospace; font-size: 14px; padding: 16px; margin: 10px 0 30px 0;">
                        ${token}
                      </div>

                      <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 30px 0 20px 0;">

                      <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 10px 0;">
                        If you didn't create an account, you can safely ignore this email.
                      </p>

                      <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 10px 0;">
                        Email sent to: <strong>${user.email}</strong>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `

    console.log('Sending email via Resend')
    const { error } = await resend.emails.send({
      from: 'AI-Alliance <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Verify your Vidhya account',
      html,
    })
    
    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully to:', user.email)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    
  } catch (err) {
    const error = err as { code?: number; message?: string }
    console.error('Email sending error:', error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: error.code || 500,
          message: error.message || 'Failed to send email',
        },
      }),
      {
        status: error.code || 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
