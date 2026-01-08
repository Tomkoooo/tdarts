import {
  Buyer,
  Client,
  Invoice,
  Item,
  Seller,
  Currencies,
  Languages,
  PaymentMethods,
} from 'szamlazz.js';
import { sendEmail } from '@/lib/mailer';

/**
 * Számlázz.hu Integration Utility
 * Handles automatic invoice generation and delivery via email.
 */
export class SzamlazzService {
  /**
   * Generates and sends an e-invoice for an OAC tournament creation.
   */
  static async createOacInvoice(tournament: any, billingInfo: any) {
    try {
      if (!process.env.OAC_SZAMLAZZ_KEY) {
        console.warn('Skipping invoice generation: OAC_SZAMLAZZ_KEY not set');
        return null;
      }

      const client = new Client({
        authToken: process.env.OAC_SZAMLAZZ_KEY,
        eInvoice: true,
        requestInvoiceDownload: true,
      });

      const seller = new Seller({
        email: {
          replyToAddress: process.env.OAC_SELLER_EMAIL || 'office@magyardarts.hu',
          subject: 'OAC Verseny Hitelesítési Számla',
          message: 'Sikeres fizetés! Mellékelten küldjük az e-számlát.',
        },
        issuerName: process.env.OAC_SELLER_NAME || 'Magyar Darts Szövetség.',
      });

      const buyer = new Buyer({
        name: billingInfo.name,
        zip: billingInfo.zip,
        city: billingInfo.city,
        address: billingInfo.address,
        taxNumber: billingInfo.taxId || '',
        email: billingInfo.email,
        sendEmail: true,
      });

      const item = new Item({
        label: `OAC Verseny Hitelesítés - ${tournament.tournamentSettings.name}`,
        quantity: 1,
        unit: 'db',
        netUnitPrice: 3000,
        vat: 27, // VAT percentage as number
      });

      const invoice = new Invoice({
        paymentMethod: PaymentMethods.CreditCard, // Or Stripe if available
        currency: Currencies.HUF,
        language: Languages.Hungarian,
        seller: seller,
        buyer: buyer,
        items: [item],
        paid: true,
      });

      const result = await client.issueInvoice(invoice);
      console.log('Invoice issued successfully:', result.invoiceId);

      // Attempt to send email with PDF attachment if requested
      if (result.invoiceId && result.pdf) {
        try {
          const pdfBuffer = await this.processPdfData(result.pdf, result.invoiceId);
          if (pdfBuffer) {
            console.log(`[SzamlazzService] Sending invoice email with attachment to ${billingInfo.email}`);
            await sendEmail({
              to: [billingInfo.email],
              subject: 'tDarts OAC - Elektronikus számla',
              text: `Kedves ${billingInfo.name}!\n\nSikeres fizetés! Mellékelten küldjük a(z) ${result.invoiceId} számú elektronikus számlát.\n\nÜdvözlettel,\ntDarts Csapat`,
              html: `<p>Kedves <strong>${billingInfo.name}</strong>!</p><p>Sikeres fizetés! Mellékelten küldjük a(z) <strong>${result.invoiceId}</strong> számú elektronikus számlát.</p><p>Üdvözlettel,<br>tDarts Csapat</p>`,
              attachments: [
                {
                  filename: `szamla_${result.invoiceId}.pdf`,
                  content: pdfBuffer,
                  contentType: 'application/pdf'
                }
              ]
            });
          }
        } catch (emailErr) {
          console.error('[SzamlazzService] Failed to send invoice attachment email:', emailErr);
          // Don't throw here, as the invoice was actually created successfully
        }
      }

      return result;
    } catch (err) {
      console.error('Error issuing Számlázz.hu invoice:', err);
      throw err;
    }
  }

  /**
   * Retrieves the PDF of an existing invoice by its ID.
   */
  static async getInvoicePdf(invoiceId: string) {
    try {
      if (!process.env.OAC_SZAMLAZZ_KEY) {
        throw new Error('OAC_SZAMLAZZ_KEY not set');
      }

      const client = new Client({
        authToken: process.env.OAC_SZAMLAZZ_KEY,
        requestInvoiceDownload: true,
      });

      const result = await client.getInvoiceData({
        invoiceId: invoiceId,
        pdf: true
      });

      return await this.processPdfData(result.pdf, invoiceId);
    } catch (err) {
      console.error('Error fetching Számlázz.hu invoice PDF:', err);
      throw err;
    }
  }

  /**
   * Internal helper to process raw PDF data from Számlázz.hu API
   */
  private static async processPdfData(pdfData: any, invoiceId: string): Promise<Buffer | null> {
    try {
      if (!pdfData) {
        console.warn(`[SzamlazzService] No PDF data to process for invoice ${invoiceId}`);
        return null;
      }

      console.log(`[SzamlazzService] Processing PDF for ${invoiceId}. Raw type: ${typeof pdfData}, isArray: ${Array.isArray(pdfData)}`);
      
      let processedData = pdfData;

      // Handle the case where pdfData is an array
      if (Array.isArray(processedData) && processedData.length > 0) {
        processedData = processedData[0];
      }

      // Handle the case where pdfData is an object
      if (typeof processedData === 'object' && processedData !== null && !(processedData instanceof Uint8Array) && !Buffer.isBuffer(processedData)) {
        if (processedData._) {
            processedData = processedData._;
        } else if (processedData.content) {
            processedData = processedData.content;
        }
      }

      if (typeof processedData === 'string') {
        const preview = processedData.substring(0, 50);
        if (preview.startsWith('%PDF')) {
             processedData = Buffer.from(processedData, 'binary');
        } else {
            try {
                processedData = Buffer.from(processedData, 'base64');
            } catch (e) {
                console.error('[SzamlazzService] Failed to convert string to base64 buffer', e);
            }
        }
      }

      const buffer = Buffer.from(processedData as any);
      console.log(`[SzamlazzService] Processed PDF size: ${buffer.length} bytes for ${invoiceId}`);
      return buffer;
    } catch (err) {
      console.error('[SzamlazzService] Error in processPdfData:', err);
      return null;
    }
  }
}
