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
          replyToAddress: process.env.OAC_SELLER_EMAIL || 'info@tdarts.hu',
          subject: 'OAC Verseny Hitelesítési Számla',
          message: 'Sikeres fizetés! Mellékelten küldjük az e-számlát.',
        },
        issuerName: process.env.OAC_SELLER_NAME || 'Tomkoooo Kft.',
      });

      const buyer = new Buyer({
        name: billingInfo.name,
        zip: billingInfo.zip,
        city: billingInfo.city,
        address: billingInfo.address,
        taxNumber: billingInfo.taxId || '',
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
      return result;
    } catch (err) {
      console.error('Error issuing Számlázz.hu invoice:', err);
      throw err;
    }
  }
}
