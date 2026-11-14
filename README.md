# Fuhrend Management website

A static, responsive information website for Fuhrend Management s.r.o. Open `index.html` directly in a browser to preview it. No build step or package installation is required.

## Content

The company name and service descriptions are based on the supplied PDF, `fuhrend info for web.pdf`. Text is edited for clarity; service outcomes are not guaranteed. Confirm the exact legal wording and preferred service terminology with the company before publication. No country or city is stated on the site because the operating location is not yet confirmed.

Retail POS and payroll software were added as planned Software solutions. Both are marked in development and reveal a coming-soon message when opened; the site does not claim they are available or take product orders.

The email `fuhrand@xyz.com` was supplied for this draft. The displayed phone number, `+12 123456`, is a non-clickable placeholder and must be replaced before publishing. Verify the receiving inbox before publishing.

## Enquiry form / Web3Forms

The form is wired to Web3Forms, but no access key is committed. Until one is added, it opens a prefilled email draft and the visitor must send it manually. To enable direct submission:

1. At [web3forms.com](https://web3forms.com/), create an access key for the verified email inbox that should receive enquiries. This can be different from the public address displayed on the site, but it must be an inbox the client controls.
2. Put the key in the `value` of the hidden `access_key` input near the start of `#enquiry-form` in `index.html`. Web3Forms access keys are public identifiers designed to appear in client-side forms; do not put an email password or other secret there.
3. Deploy the updated site and send a test enquiry from the public URL. Confirm the success message appears and the message reaches the intended inbox (check spam too). Test the error state with a deliberately invalid key before replacing it with the real one.

The direct-submission path sends form data to `https://api.web3forms.com/submit` over HTTPS and checks the API response before showing a success dialog. A network, server or rate-limit failure opens an error dialog with a prefilled email draft option; the entered text stays in the form. A hidden `botcheck` field provides basic spam filtering; assess Web3Forms' stronger captcha options if the public form receives spam. The form includes a brief processing notice, but the client should review and publish an appropriate privacy notice before accepting real enquiries. Do not ask visitors to submit identity documents or other sensitive information through this form.

## Images

- The header mark is a clean vector redraw of the supplied Fuhrend Management monogram; the supplied raster logo remains in `assets/fuhrend-logo.jpeg`.
- Consultation: [Olena Kholina on Unsplash](https://unsplash.com/photos/two-people-reviewing-documents-at-a-table-MhqUBTxQ3Hw).
- Mobile consultation: [Pavel Danilyuk on Pexels](https://www.pexels.com/photo/woman-signing-a-document-near-a-laptop-7518972/).
- The Business consultancy, Digital marketing, Expat services and Software solutions card images were generated specifically for this website. They depict illustrative scenes, not Fuhrend staff, clients or released products.
- The social preview is composed from the Fuhrend monogram and the illustrative Business consultancy image. On macOS, regenerate it with `swift scripts/build-social-preview.swift "$PWD"`.
- Accommodation: [Clay Banks on Unsplash](https://unsplash.com/photos/a-bright-bedroom-with-a-desk-and-a-large-bed-bhoMFZB_6Bg).

All site imagery is illustrative, not Fuhrend staff, premises, or property listings. Replace it with approved company imagery when available.

## Motion

The hero text enters in a short sequence. Selected section headings and copy fade from transparent as they rise into view; service choices and approach steps follow with a small stagger, and service photos ease in without shifting the card layout. Motion is disabled when a visitor requests reduced motion, and content remains readable without JavaScript.

## Languages

The site includes English (UK), Czech, Russian and German. On a first visit, it chooses a supported browser language or falls back to English, and opens the language chooser so visitors can see the other options. An explicit choice is saved in local storage. All visible copy, image descriptions, page title, description and email subject lines are maintained in `translations.js`. Without JavaScript, the English page remains readable.

The language control uses a locally hosted [Lucide globe icon](https://lucide.dev/icons/globe) under the [ISC licence](https://lucide.dev/license). The browser interaction and viewport checks can be rerun on macOS with Chrome using `node scripts/verify-languages.mjs`.

## Hosting

Upload the contents of this folder to any static host. Enable HTTPS, compression and standard security headers at the host. The page includes a restrictive CSP in its HTML and uses only local assets.

Before sharing the public site, replace the relative `og:image` and `twitter:image` values in `index.html` with the verified full HTTPS URL of `assets/social-preview.jpg`, and add an `og:url` tag for the canonical page URL. The deployment must allow public access to the page and image for social crawlers to show the preview.

For a client-facing demo, confirm the hosting plan permits commercial use. Vercel Hobby is limited to personal, non-commercial use; Vercel Pro or a static host whose free plan allows client work is more appropriate.
