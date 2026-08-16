/**
 * Parameters for rendering the password reset HTML email template.
 */
export interface ForgotPasswordEmailTemplateParams {
  /** Optional user display name */
  name?: string;
  /** Full password reset URL containing the reset token */
  resetPasswordUrl: string;
}

/**
 * Renders the HTML template for password reset emails.
 *
 * @param params - Template options including optional user name and password reset URL.
 * @returns Formatted HTML string ready to send via email.
 */
export function forgotPasswordEmailTemplate({
  name,
  resetPasswordUrl,
}: ForgotPasswordEmailTemplateParams): string {
  return `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <meta name="color-scheme" content="light" />
            <meta name="supported-color-schemes" content="light" />

            <title>Password reset</title>
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background-color: #f4f6f8;
              font-family: Arial, Helvetica, sans-serif;
              color: #1f2937;
            "
          >
            <table
              role="presentation"
              width="100%"
              cellspacing="0"
              cellpadding="0"
              border="0"
              style="background-color: #f4f6f8;"
            >
              <tr>
                <td align="center" style="padding: 40px 16px;">

                  <!-- Container -->
                  <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                      max-width: 560px;
                      background-color: #ffffff;
                      border-radius: 12px;
                      overflow: hidden;
                    "
                  >

                    <!-- Header -->
                    <tr>
                      <td
                        align="center"
                        style="padding: 36px 32px 24px;"
                      >
                        <img
                          src="cid:app-logo"
                          alt="Zen"
                          width="64"
                          style="
                            display: block;
                            width: 64px;
                            height: auto;
                            border: 0;
                          "
                        />
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 0 40px 40px;">

                        <h1
                          style="
                            margin: 0 0 20px;
                            text-align: center;
                            font-size: 26px;
                            line-height: 36px;
                            font-weight: 700;
                            color: #111827;
                          "
                        >
                          Verify your email
                        </h1>

                        <p
                          style="
                            margin: 0 0 16px;
                            font-size: 16px;
                            line-height: 26px;
                            color: #4b5563;
                          "
                        >
                          ${name ? `Hi ${escapeHtml(name)},` : "Hello,"}
                        </p>

                        <p
                          style="
                            margin: 0 0 24px;
                            font-size: 16px;
                            line-height: 26px;
                            color: #4b5563;
                          "
                        >
                          We received a request to reset the password for the user associated with this email address. 
                          Please reset your password by clicking the button below.
                        </p>

                        <!-- Button -->
                        <table
                          role="presentation"
                          cellspacing="0"
                          cellpadding="0"
                          border="0"
                          align="center"
                          style="margin: 0 auto 28px;"
                        >
                          <tr>
                            <td
                              align="center"
                              style="
                                border-radius: 8px;
                                background-color: #111827;
                              "
                            >
                              <a
                                href="${resetPasswordUrl}"
                                target="_blank"
                                style="
                                  display: inline-block;
                                  padding: 14px 28px;
                                  font-size: 16px;
                                  font-weight: 600;
                                  line-height: 24px;
                                  color: #ffffff;
                                  text-decoration: none;
                                  border-radius: 8px;
                                "
                              >
                                Reset password
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p
                          style="
                            margin: 0 0 20px;
                            font-size: 14px;
                            line-height: 22px;
                            color: #6b7280;
                            text-align: center;
                          "
                        >
                          This link will expire in
                          <strong>15 minutes</strong>.
                        </p>

                        <!-- Fallback URL -->
                        <p
                          style="
                            margin: 0;
                            font-size: 13px;
                            line-height: 20px;
                            color: #9ca3af;
                          "
                        >
                          If the button doesn't work, copy and paste
                          the following URL into your browser:
                        </p>

                        <p
                          style="
                            margin: 8px 0 0;
                            word-break: break-all;
                            font-size: 13px;
                            line-height: 20px;
                          "
                        >
                          <a
                            href="${resetPasswordUrl}"
                            target="_blank"
                            style="
                              color: #4b5563;
                              text-decoration: underline;
                            "
                          >
                            ${resetPasswordUrl}
                          </a>
                        </p>

                        <hr
                          style="
                            margin: 32px 0;
                            border: 0;
                            border-top: 1px solid #e5e7eb;
                          "
                        />

                        <p
                          style="
                            margin: 0;
                            font-size: 13px;
                            line-height: 20px;
                            color: #9ca3af;
                          "
                        >
                          If you did not request to reset this password, 
                          you can ignore this request.
                        </p>

                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td
                        align="center"
                        style="
                          padding: 24px 32px;
                          background-color: #f9fafb;
                        "
                      >
                        <p
                          style="
                            margin: 0;
                            font-size: 12px;
                            line-height: 18px;
                            color: #9ca3af;
                          "
                        >
                          © ${new Date().getFullYear()} Personal Project.
                          All rights reserved.
                        </p>
                      </td>
                    </tr>

                  </table>

                </td>
              </tr>
            </table>
          </body>
          </html>
          `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
