require('dotenv').config();
const nodemailer = require('nodemailer');

// Check if email service is properly configured
let emailConfigured = false;
let configError = null;
let transporter = null;

try {
  // Validate required environment variables
  if (!process.env.GMAIL_USER) {
    configError = 'GMAIL_USER is not configured';
  } else if (!process.env.GMAIL_APP_PASSWORD) {
    configError = 'GMAIL_APP_PASSWORD is not configured';
  } else if (!process.env.NOTIFICATION_EMAIL) {
    configError = 'NOTIFICATION_EMAIL is not configured';
  } else {
    // Configure nodemailer with Gmail SMTP
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    emailConfigured = true;
    console.log('✓ Email service configured successfully (Gmail SMTP)');
    console.log(`✓ Sending from: ${process.env.GMAIL_USER}`);
    console.log(`✓ Sending to: ${process.env.NOTIFICATION_EMAIL}`);
  }
} catch (error) {
  configError = error.message;
}

if (!emailConfigured) {
  console.warn('⚠ Email service not configured:', configError);
  console.warn('⚠ App will continue to work, but email notifications will not be sent');
}

/**
 * Send email notification when module field is changed
 * @param {Object} moduleData - Module information
 * @param {string} moduleData.code - Module code (e.g., "41822")
 * @param {string} moduleData.title - Module title
 * @param {string} moduleData.year - Academic year (e.g., "2025")
 * @param {string} field - Field that was changed ("Semester" or "Module Lead")
 * @param {string} oldValue - Original value before change
 * @param {string} newValue - New value after change
 * @returns {Promise<Object>} - Success/failure status
 */
async function sendModuleChangeNotification(moduleData, field, oldValue, newValue) {
  try {
    // Check if email service is configured
    if (!emailConfigured) {
      console.warn('Email notification not sent - email service not configured:', configError);
      return {
        success: false,
        message: 'Email service not configured',
        error: configError,
        configured: false
      };
    }

    // Format timestamp
    const timestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Build email content
    const emailSubject = `Module Update Request: ${moduleData.code} - ${field} Change`;

    const emailBody = `
Module Update Request

A change has been requested for the following module:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Module Code:    ${moduleData.code}
Module Title:   ${moduleData.title}
Academic Year:  ${moduleData.year}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHANGE REQUESTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Field:          ${field}
Original Value: ${oldValue || '(not set)'}
New Value:      ${newValue}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Request Time: ${timestamp}

This is an automated notification from the Programme & Module Specification system.
Please update the student records system accordingly.
    `.trim();

    // Prepare email message for nodemailer
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL,
      subject: emailSubject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Module Update Request</h2>
          <p>A change has been requested for the following module:</p>

          <div style="background-color: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #1f2937; margin-top: 0; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
              Module Details
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Module Code:</td>
                <td style="padding: 8px 0;">${moduleData.code}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Module Title:</td>
                <td style="padding: 8px 0;">${moduleData.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Academic Year:</td>
                <td style="padding: 8px 0;">${moduleData.year}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
              Change Requested
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #78350f;">Field:</td>
                <td style="padding: 8px 0;">${field}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #78350f;">Original Value:</td>
                <td style="padding: 8px 0; text-decoration: line-through; color: #ef4444;">${oldValue || '(not set)'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #78350f;">New Value:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #059669;">${newValue}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p><strong>Request Time:</strong> ${timestamp}</p>
            <p style="margin-top: 15px; font-style: italic;">
              This is an automated notification from the Programme & Module Specification system.<br>
              Please update the student records system accordingly.
            </p>
          </div>
        </div>
      `
    };

    // Send email via Gmail SMTP
    console.log(`Sending module change notification email for ${moduleData.code} (${field} change)`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${process.env.NOTIFICATION_EMAIL}`);
    console.log(`Message ID: ${info.messageId}`);

    return {
      success: true,
      message: 'Email notification sent successfully'
    };

  } catch (error) {
    console.error('Error sending email notification:', error);

    let errorMessage = 'Failed to send email notification';
    let errorDetails = error.message;

    // Handle nodemailer/Gmail-specific errors
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed';
      errorDetails = 'Invalid Gmail credentials or App Password. Please check GMAIL_USER and GMAIL_APP_PASSWORD in .env file';
      console.error('⚠ Gmail authentication failed. Make sure you\'re using an App Password, not your regular password.');
      console.error('⚠ Generate App Password at: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection to Gmail failed';
      errorDetails = 'Could not connect to Gmail SMTP server. Check your internet connection.';
    } else if (error.responseCode === 550) {
      errorMessage = 'Email rejected by server';
      errorDetails = 'Gmail rejected the email. Check recipient address or sender reputation.';
    }

    return {
      success: false,
      message: errorMessage,
      error: errorDetails,
      configured: true
    };
  }
}

module.exports = {
  sendModuleChangeNotification
};
