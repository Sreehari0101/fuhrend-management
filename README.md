# Fuhrend Management website

A static, responsive information website for Fuhrend Management s.r.o. Open `index.html` directly in a browser to preview it. No build step or package installation is required.

## Content

The company name and service descriptions are based on the supplied PDF, `fuhrend info for web.pdf`. Text is edited for clarity; service outcomes are not guaranteed. Confirm the exact legal wording and preferred service terminology with the company before publication. No country or city is stated on the site because the operating location is not yet confirmed.

The email `fuhrand@xyz.com` was supplied for this draft. The displayed phone number, `+12 123456`, is a non-clickable placeholder and must be replaced before publishing. Email actions use `mailto:` links; there is no contact form, visitor-data collection, or third-party script. Confirm the inbox is active before publishing.

## Images

- The header mark is a clean vector redraw of the supplied Fuhrend Management monogram; the supplied raster logo remains in `assets/fuhrend-logo.jpeg`.
- Consultation: [Olena Kholina on Unsplash](https://unsplash.com/photos/two-people-reviewing-documents-at-a-table-MhqUBTxQ3Hw).
- Mobile consultation: [Pavel Danilyuk on Pexels](https://www.pexels.com/photo/woman-signing-a-document-near-a-laptop-7518972/).
- The Business consultancy, Digital marketing and Expat services card images were generated specifically for this website. They depict illustrative scenes, not Fuhrend staff or clients.
- The social preview is composed from the Fuhrend monogram and the illustrative Business consultancy image. On macOS, regenerate it with `swift scripts/build-social-preview.swift "$PWD"`.
- Accommodation: [Clay Banks on Unsplash](https://unsplash.com/photos/a-bright-bedroom-with-a-desk-and-a-large-bed-bhoMFZB_6Bg).

All site imagery is illustrative, not Fuhrend staff, premises, or property listings. Replace it with approved company imagery when available.

## Motion

The hero text enters in a short sequence. Selected section headings and copy fade from transparent as they rise into view; service choices and approach steps follow with a small stagger, and service photos ease in without shifting the card layout. Motion is disabled when a visitor requests reduced motion, and content remains readable without JavaScript.

## Hosting

Upload the contents of this folder to any static host. Enable HTTPS, compression and standard security headers at the host. The page includes a restrictive CSP in its HTML and uses only local assets.

Before sharing the public site, replace the relative `og:image` and `twitter:image` values in `index.html` with the verified full HTTPS URL of `assets/social-preview.jpg`, and add an `og:url` tag for the canonical page URL. The deployment must allow public access to the page and image for social crawlers to show the preview.

For a client-facing demo, confirm the hosting plan permits commercial use. Vercel Hobby is limited to personal, non-commercial use; Vercel Pro or a static host whose free plan allows client work is more appropriate.
