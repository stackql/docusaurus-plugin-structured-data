const path = require('path');
const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

module.exports = function (context) {
    const {siteConfig} = context;
    const {themeConfig} = siteConfig;
    const {structuredData} = themeConfig || {};

    if (!structuredData) {
        throw new Error(
        `You need to specify the 'structuredData' object in 'themeConfig' to use docusaurus-plugin-structured-data`,
        );
    }

    const baseUrl = siteConfig.url;
    const orgName = siteConfig.title;

    const orgData = {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: `${orgName}`,
        url: `${baseUrl}`,
        image: {
            '@id': `${baseUrl}/#/schema/logo/image/`,
        },
        ...structuredData.organization,
    };

    const webSiteData = {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        name: `${orgName}`,
        url: `${baseUrl}`,
        description: `${siteConfig.tagline}`,
        publisher: {
            '@id': `${baseUrl}/#organization`,
        },
        potentialAction: [
            {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${baseUrl}/search?q={searchTerms}`,
              },
              'query-input': 'required name=searchTerms'
            }
          ],
        ...structuredData.website,
    };

    let webPageData = {
        '@type': 'WebPage',
        isPartOf: {
            '@id': `${baseUrl}/#website`
        },
        ...structuredData.webpage,
    };

    let breadcrumbData = {
        '@type': 'BreadcrumbList',
        itemListElement: [],
    };

    let data = {};
    data['@context'] = "https://schema.org";
    data['@graph'] = [];

    // webpage
    // breadcrumb
    // website
    // organization

  return {
    name: 'docusaurus-plugin-structured-data',
    async postBuild({siteConfig = {}, routesPaths = [], outDir}) {
        routesPaths.map((route) => {
            if (route === '/404.html') {
                return;
            }
            if (route === '/') {
                // console.log(`processing ${route}...`);
                // const filePath = path.join(outDir, route, 'index.html');

                // JSDOM.fromFile(filePath).then(dom => {
                //     console.log(dom.window.document.querySelector("title").text);
                //     let script = dom.window.document.createElement("script");
                //     script.type = "application/ld+json";
                //     script.src = JSON.stringify(siteConfig, null, 2);
                //     dom.window.document.head.appendChild(script);
                //     fs.writeFileSync(filePath, dom.serialize());
                // });
                console.log(webSiteData);

            }
        });
      },
    // injectHtmlTags() {
    //   if (!isProd) {
    //     return {};
    //   }
    //   return {
    //     headTags: [
    //       {
    //         tagName: 'script',
    //         innerHTML: JSON.stringify(siteConfig, null, 2),
    //       },
    //     ],
    //   };
    // },
  };
};