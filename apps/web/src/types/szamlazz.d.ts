declare module "szamlazz.js" {
    export class Seller {
        constructor(config: {
            bank?: {
                name?: string;
                accountNumber?: string;
            };
            email?: {
                replyToAddress?: string;
                subject?: string;
                message?: string;
            };
            issuerName?: string;
        });
    }

    export class Client {
        constructor(config: {
            user?: string;
            password?: string;
            authToken?: string;
            eInvoice?: boolean;
            requestInvoiceDownload?: boolean;
            downloadedInvoiceCount?: number;
            responseVersion?: number;
            timeout?: number;
        });
        issueInvoice(invoice: Invoice): Promise<{
            invoiceId: string;
            netTotal: string;
            grossTotal: string;
            customerAccountUrl?: string;
            pdf?: Buffer;
        }>;
        getInvoiceData(params: {
            invoiceId?: string;
            orderNumber?: string;
            pdf?: boolean;
        }): Promise<any>;
        reverseInvoice(params: {
            invoiceId: string;
            eInvoice?: boolean;
            requestInvoiceDownload?: boolean;
        }): Promise<any>;
    }

    export class Buyer {
        constructor(config: {
            name: string;
            country?: string;
            zip: string;
            city: string;
            address: string;
            taxNumber?: string;
            postAddress?: {
                name?: string;
                zip?: string;
                city?: string;
                address?: string;
            };
            issuerName?: string;
            identifier?: number;
            phone?: string;
            comment?: string;
            email?: string;
            sendEmail?: boolean;
        });
    }

    export class Item {
        constructor(config: {
            label: string;
            quantity: number;
            unit: string;
            vat: number | string;
            netUnitPrice?: number;
            grossUnitPrice?: number;
            comment?: string;
        });
    }

    export class Invoice {
        constructor(config: {
            paymentMethod?: string;
            currency?: string;
            language?: string;
            seller: Seller;
            buyer: Buyer;
            items: Item[];
            noNavReport?: boolean;
            prepaymentInvoice?: boolean;
            adjustmentInvoiceNumber?: string;
            eInvoice?: boolean;
            dueDate?: Date;
            paid?: boolean;
        });
    }

    export const Currency: {
        Ft: string;
        HUF: string;
        EUR: string;
        CHF: string;
        USD: string;
        [key: string]: string;
    };
    export const Currencies: typeof Currency;

    export const Language: {
        Hungarian: string;
        English: string;
        German: string;
        Italian: string;
        Romanian: string;
        Slovak: string;
        [key: string]: string;
    };
    export const Languages: typeof Language;

    export const PaymentMethod: {
        Cash: string;
        BankTransfer: string;
        CreditCard: string;
        PayPal: string;
        [key: string]: string;
    };
    export const PaymentMethods: typeof PaymentMethod;
}