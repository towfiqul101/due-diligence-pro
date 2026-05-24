export const CLIENT_WIZARD_TEMPLATE = `<iframe src="https://due-diligence-pro-phi.vercel.app/api/wizard/client?loc=LOCATION_ID_PLACEHOLDER" style="width:100%;min-height:100vh;border:none;" loading="lazy"></iframe>`;

export const PREPARER_WIZARD_TEMPLATE = `<iframe src="https://due-diligence-pro-phi.vercel.app/api/wizard/preparer?loc=LOCATION_ID_PLACEHOLDER" style="width:100%;min-height:100vh;border:none;" loading="lazy"></iframe>`;

export function generateEmbedCode(template, locationId) {
  return template.replace(/LOCATION_ID_PLACEHOLDER/g, locationId);
}
