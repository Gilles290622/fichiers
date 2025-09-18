import { siWhatsapp as whatsapp, siAdobeacrobatreader as adobeacrobatreader, siAdobephotoshop as adobephotoshop } from 'simple-icons';

const Svg = ({ path, title, color, size = 16, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} role="img" aria-label={title}>
    <title>{title}</title>
    <path d={path} fill={color} />
  </svg>
);

export const WhatsAppBrandIcon = (props) => (
  <Svg path={whatsapp.path} color={`#${whatsapp.hex}`} title="WhatsApp" {...props} />
);

export const PdfBrandIcon = (props) => (
  <Svg path={adobeacrobatreader.path} color={`#${adobeacrobatreader.hex}`} title="PDF" {...props} />
);

export const PhotoshopBrandIcon = (props) => (
  <Svg path={adobephotoshop.path} color={`#${adobephotoshop.hex}`} title="Photoshop" {...props} />
);
