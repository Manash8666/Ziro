import crypto from 'node:crypto';

export interface OndcSellerAdapterOptions {
  subscriberId: string;
  uniqueKeyId: string;
  privateKeyPem: string;
  publicKeyPem: string;
}

export interface OndcCatalogItemInput {
  id: string;
  title: string;
  price_minor: number;
  currency: string;
  stock_qty: number;
}

export class OndcSellerAdapter {
  private subscriberId: string;
  private uniqueKeyId: string;
  private privateKeyPem: string;
  private publicKeyPem: string;

  constructor(options: OndcSellerAdapterOptions) {
    this.subscriberId = options.subscriberId;
    this.uniqueKeyId = options.uniqueKeyId;
    this.privateKeyPem = options.privateKeyPem;
    this.publicKeyPem = options.publicKeyPem;
  }

  private computeDigest(rawBody: string | Buffer): string {
    const hash = crypto.createHash('blake2b512').update(rawBody).digest('base64');
    return `BLAKE-512=${hash}`;
  }

  private buildSigningString(digest: string, createdSec: number, expiresSec: number): string {
    return `(created): ${createdSec}\n(expires): ${expiresSec}\ndigest: ${digest}`;
  }

  signRequest(
    rawBody: string | Buffer,
    createdSec = Math.floor(Date.now() / 1000),
    expiresSec = createdSec + 300,
  ): string {
    const digest = this.computeDigest(rawBody);
    const signingString = this.buildSigningString(digest, createdSec, expiresSec);
    const signature = crypto
      .sign(null, Buffer.from(signingString, 'utf8'), this.privateKeyPem)
      .toString('base64');

    const keyId = `${this.subscriberId}|${this.uniqueKeyId}|ed25519`;
    return `Signature keyId="${keyId}",algorithm="ed25519",created="${createdSec}",expires="${expiresSec}",headers="(created) (expires) digest",signature="${signature}"`;
  }

  verifyRequest(
    rawBody: string | Buffer,
    authHeader: string,
    publicKeyPem = this.publicKeyPem,
    nowSec = Math.floor(Date.now() / 1000),
  ): boolean {
    if (!authHeader || !authHeader.startsWith('Signature ')) {
      return false;
    }

    try {
      const params: Record<string, string> = {};
      const regex = /(\w+)="([^"]*)"/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(authHeader)) !== null) {
        params[match[1]] = match[2];
      }

      if (params.algorithm !== 'ed25519' || !params.signature || !params.created || !params.expires) {
        return false;
      }

      const created = Number(params.created);
      const expires = Number(params.expires);
      if (!Number.isFinite(created) || !Number.isFinite(expires) || nowSec > expires) {
        return false;
      }

      const digest = this.computeDigest(rawBody);
      const signingString = this.buildSigningString(digest, created, expires);
      return crypto.verify(
        null,
        Buffer.from(signingString, 'utf8'),
        publicKeyPem,
        Buffer.from(params.signature, 'base64'),
      );
    } catch {
      return false;
    }
  }

  translateCatalogToOnSearch(params: {
    context: any;
    providerName: string;
    items: OndcCatalogItemInput[];
  }) {
    return {
      context: {
        ...params.context,
        action: 'on_search',
        bpp_id: this.subscriberId,
        timestamp: new Date().toISOString(),
      },
      message: {
        catalog: {
          'bpp/descriptor': {
            name: params.providerName,
          },
          'bpp/providers': [
            {
              id: this.subscriberId,
              descriptor: {
                name: params.providerName,
              },
              items: params.items.map((item) => ({
                id: item.id,
                descriptor: {
                  name: item.title,
                },
                price: {
                  currency: item.currency,
                  value: (item.price_minor / 100).toFixed(2),
                },
                quantity: {
                  available: {
                    count: item.stock_qty,
                  },
                },
              })),
            },
          ],
        },
      },
    };
  }
}
