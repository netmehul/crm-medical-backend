// src/services/MockEmailService.js
// Logs to console in development — swap for real SMTP when ready

class MockEmailService {
  async sendPaymentReminder({ to, supplier, amount, dueDate, item }) {
    // Check if mock email is enabled in env, default to true for development
    const isMock = process.env.MOCK_EMAIL !== 'false';
    
    if (isMock) {
      console.log(`
📧 MOCK EMAIL — Payment Reminder
To:       ${to || 'supplier@example.com'}
Subject:  Payment Reminder: ${amount} due on ${dueDate}
Body:
  Dear ${supplier},
  This is a reminder that a payment of ${amount} is due on ${dueDate}
  for the following item: ${item}.
  Please arrange payment at your earliest convenience.
      `);
      return { success: true, mock: true };
    }
    
    // When MOCK_EMAIL=false — wire up real SMTP here (Nodemailer)
    // For now, we only implement the mock version as requested
    return { success: false, message: 'Real email not configured' };
  }
}

module.exports = new MockEmailService();
