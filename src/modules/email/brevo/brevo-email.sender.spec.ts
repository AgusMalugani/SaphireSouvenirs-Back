jest.mock('src/config/envs', () => ({
  envs: {
    BREVO_API_KEY: 'test-brevo-api-key',
    EMAIL_FROM: 'noreply@example.com',
    EMAIL_CC: 'cc@example.com',
  },
}));

import { Logger } from '@nestjs/common';
import { BrevoEmailSender } from './brevo-email.sender';
import { SendOrderConfirmationPayload } from '../send-order-confirmation.payload';

describe('BrevoEmailSender', () => {
  let brevoEmailSender: BrevoEmailSender;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  const fetchMock = jest.fn();

  const payload: SendOrderConfirmationPayload = {
    to: 'client@example.com',
    cc: 'cc@example.com',
    subject: 'Confirmación de Pedido',
    html: '<p>Test order</p>',
    orderId: 'order-123',
  };

  beforeEach(() => {
    brevoEmailSender = new BrevoEmailSender();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('sends order confirmation via Brevo API on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ messageId: 'brevo-123' }),
    });

    await brevoEmailSender.sendOrderConfirmation(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'api-key': 'test-brevo-api-key',
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'SaphireSouvenirs', email: 'noreply@example.com' },
          to: [{ email: payload.to }],
          cc: [{ email: payload.cc }],
          subject: payload.subject,
          htmlContent: payload.html,
        }),
      }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      'Order confirmation email sent for order-123: brevo-123',
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs warn without throwing on HTTP 400 error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('Invalid sender'),
    });

    await expect(
      brevoEmailSender.sendOrderConfirmation(payload),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'Order confirmation email failed for order-123: HTTP 400 Invalid sender',
    );
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs warn without throwing on HTTP 401 error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Unauthorized'),
    });

    await expect(
      brevoEmailSender.sendOrderConfirmation(payload),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'Order confirmation email failed for order-123: HTTP 401 Unauthorized',
    );
  });

  it('logs warn without throwing on HTTP 500 error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Server Error'),
    });

    await expect(
      brevoEmailSender.sendOrderConfirmation(payload),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'Order confirmation email failed for order-123: HTTP 500 Internal Server Error',
    );
  });

  it('logs warn without throwing on network error', async () => {
    fetchMock.mockRejectedValue(new Error('fetch timeout'));

    await expect(
      brevoEmailSender.sendOrderConfirmation(payload),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'Order confirmation email failed for order-123',
      expect.any(String),
    );
  });
});
