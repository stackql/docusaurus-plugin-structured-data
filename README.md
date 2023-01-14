# docusaurus-plugin-structured-data
> Plugin to configure [__Structured Data__](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) for Docusaurus sites

## How it works

This plugin will generate  [__Structured Data__](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) for your Docusaurus site, compliant with [__schema.org__](https://schema.org/).  

The plugin will generate the following types of structured data, and include them in the `<head>` of your site using the [__JSON-LD__](https://developers.google.com/search/docs/guides/intro-structured-data) format:  

- [__`Organization`__](https://schema.org/Organization) - *augmented using data from `themeConfig.structuredData.organization`*
- [__`WebSite`__](https://schema.org/WebSite) - *augmented using data from `themeConfig.structuredData.website`*
- [__`WebPage`__](https://schema.org/WebPage) - *dynamically generated for each page*

`Organization` and `WebSite` can be extended using the `themeConfig.structuredData` object based upon properties provided (e.g. you can add any `schema.org` compliant properties for `Organization` and `WebSite` and these will be automatically included in your structured data for each page).  

`WebPage` structured data is dynamically generated for each page, and includes the following properties:  

- [__`name`__](https://schema.org/name) - *sourced from page `title`*
- [__`url`__](https://schema.org/url) - *page url*
- [__`description`__](https://schema.org/description) - *sourced from `description` in the page frontmatter*
- [__`BreadcrumbList`__](https://schema.org/BreadcrumbList) - *dynamically generated for each page based upon `<nav>` elements on the page*
- [__`mainEntityOfPage`__](https://schema.org/mainEntityOfPage) - *sourced from `siteConfig.url`*
- [__`headline`__](https://schema.org/headline) - *sourced from `siteConfig.title`*
- [__`dateModified`__](https://schema.org/dateModified) - *sourced from the build date*
- [__`datePublished`__](https://schema.org/datePublished) - *sourced from `themeConfig.structuredData.website.datePublished`*

> this plugin uses the `postBuild` lifecycle hook to generate the structured data for each page, and inject it into the `<head>` of the page.  It is only invoked upon __`yarn build`__ or __`npm run build`__ commands being run.  

## Installation

<details>
<summary>NPM</summary>
<p>

```bash
npm i @stackql/docusaurus-plugin-structured-data
```

</p>
</details>

<details>
<summary>YARN</summary>
<p>

```bash
yarn add @stackql/docusaurus-plugin-structured-data
```

</p>
</details>

## Setup

Add to `plugins` in `docusaurus.config.js`:

```js
{
  plugins: [
    'docusaurus-plugin-structured-data',
    ...
  ]
}
```

Update `themeConfig` in the `docusaurus.config.js` file, the following shows mandatory properties:

```js
{
  ...,
  themeConfig: {
    structuredData: {
      organization: {}, // Organization properties can be added to this object
      website: {}, // WebSite properties can be added to this object
      webpage: {
        datePublished: string // date published for the site
      },
    },
    ...
  }
```

## Config Example

Below is an example of a `docusaurus.config.js` file with the `themeConfig.structuredData` object populated with all available properties:  

```js
structuredData: {
  organization: {
    sameAs: [
      'https://twitter.com/stackql',
      'https://www.linkedin.com/company/stackql',
      'https://github.com/stackql',
      'https://www.youtube.com/@stackql',
      'https://hub.docker.com/u/stackql',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@stackql.io',
    },
    logo: {
      '@type': 'ImageObject',
      inLanguage: 'en-US',
      '@id': 'https://stackql.io/#/schema/logo/image/',
      url: 'https://stackql.io',
      contentUrl: 'orgLogoContentUrl',
      width: 0,
      height: 0,
      caption: '',
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'AU', // https://en.wikipedia.org/wiki/ISO_3166-1
      postalCode: '3001',
      streetAddress: 'Level 24, 570 Bourke Street, Melbourne, Victoria',
    },
    duns: '750469226',
    taxID: 'ABN 65 656 147 054',
  },
  website: {
    inLanguage: 'en-US',
  },
  webpage: {
    datePublished: '2021-07-01',
  }
},
```