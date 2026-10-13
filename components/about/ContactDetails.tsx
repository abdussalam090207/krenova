import { ExternalLink } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { siteConfig, waLink } from "@/config/site";
import { Button } from "@/components/ui/Button";

export function ContactDetails() {
  const isDummyEmail =
    siteConfig.email?.endsWith(".example") && process.env.NODE_ENV !== "production";

  return (
    <dl className="divide-y divide-[--glass-border]">
      {/* 1. Alamat */}
      {siteConfig.address && (
        <div className="py-6 first:pt-0">
          <dt className="text-sm font-medium text-[--text-2] mb-1.5">Alamat</dt>
          <dd className="text-[17px] md:text-[18px] text-[--text] leading-relaxed">
            <address className="not-italic leading-relaxed">{siteConfig.address}</address>
            {siteConfig.mapsUrl && (
              <a
                href={siteConfig.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[--aqua] hover:underline mt-2.5 font-medium transition-colors"
              >
                <span>Buka di Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
              </a>
            )}
          </dd>
        </div>
      )}

      {/* 2. Email */}
      {siteConfig.email && (
        <div className="py-6">
          <dt className="text-sm font-medium text-[--text-2] mb-1.5">Email</dt>
          <dd className="text-[17px] md:text-[18px] text-[--text] flex items-center gap-2.5 flex-wrap">
            <a
              href={`mailto:${siteConfig.email}`}
              className="hover:text-[--aqua] transition-colors underline-offset-4 hover:underline"
            >
              {siteConfig.email}
            </a>
            {isDummyEmail && (
              <span className="glass px-2 py-0.5 rounded-full text-xs text-[--text-3] border border-[--glass-border]">
                Dummy
              </span>
            )}
          </dd>
        </div>
      )}

      {/* 3. WhatsApp Admin */}
      {siteConfig.contacts && siteConfig.contacts.length > 0 && (
        <div className="py-6 last:pb-0">
          <dt className="text-sm font-medium text-[--text-2] mb-3">WhatsApp Admin</dt>
          <dd className="space-y-3">
            {siteConfig.contacts.map((contact) => (
              <div
                key={contact.wa}
                className="flex items-center justify-between gap-4 py-1"
              >
                <span className="text-[16px] md:text-[18px] text-[--text] font-medium tracking-wide">
                  {contact.display}
                </span>
                <Button
                  asChild
                  href={waLink(contact.wa)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="glass"
                  size="sm"
                  className="min-h-[44px] shrink-0 px-4"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>Chat</span>
                </Button>
              </div>
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}
