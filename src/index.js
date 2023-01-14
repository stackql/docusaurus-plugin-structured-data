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
    const verbose = structuredData.verbose || false;

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
    data['@context'] = 'https://schema.org';
    data['@graph'] = [];

  return {
    name: 'docusaurus-plugin-structured-data',
    async postBuild({siteConfig = {}, routesPaths = [], outDir}) {
        routesPaths.map((route) => {
            if (!['/404.html'].includes(route)) {
                verbose ? console.log(`processing ${route}...`): null;
                const filePath = path.join(outDir, route, 'index.html');

                JSDOM.fromFile(filePath).then(dom => {
                    const webPageUrl = `${baseUrl}${route}`;
                    verbose ? console.log(`webPageUrl: ${webPageUrl}`): null;
                    const webPageTitle = dom.window.document.querySelector('title').text;
                    verbose ? console.log(`webPageTitle: ${webPageTitle}`): null;
                    const webPageDescription = dom.window.document.head.querySelector('[name~=description][content]').content;
                    verbose ? console.log(`webPageDescription: ${webPageDescription}`): null;
                    
                    //
                    // get WebPage data
                    //
                    
                    verbose ? console.log('processing web page data...'): null;
                    webPageData['@id'] = `${webPageUrl}#webpage`;
                    webPageData['url'] = `${webPageUrl}`;
                    webPageData['name'] = webPageTitle;
                    webPageData['description'] = webPageDescription;
                    webPageData['inLanguage'] = structuredData.webpage.inLanguage || 'en-US';
                    webPageData['datePublished'] = structuredData.webpage.datePublished || new Date().toISOString();
                    webPageData['dateModified'] = new Date().toISOString();
                    webPageData['breadcrumb'] = {
                        '@id': `${webPageUrl}/#breadcrumb`
                    };
                    webPageData['potentialAction'] = [
                        {
                            '@type': 'ReadAction',
                            target: [
                                `${webPageUrl}`
                            ]
                        }
                    ];

                    //
                    // get Breadcrumb data
                    //
                    
                    verbose ? console.log('processing breadcrumb data...'): null;
                    breadcrumbData['@id'] = `${webPageUrl}/#breadcrumb`;
                    breadcrumbData['itemListElement'] = [
                        {
                            '@type': 'ListItem',
                            position: 1,
                            item: {
                                '@id': `${baseUrl}/#website`,
                                name: `${orgName}`,
                            }
                        },
                        {
                            '@type': 'ListItem',
                            position: 2,
                            item: {
                                '@id': `${webPageUrl}#webpage`,
                                name: webPageTitle,
                            }
                        }
                    ];

                    //
                    // add data to graph
                    //

                    verbose ? console.log('adding data to graph...'): null;
                    data['@graph'].push(webPageData);
                    data['@graph'].push(breadcrumbData);
                    data['@graph'].push(webSiteData);
                    data['@graph'].push(orgData);

                    let script = dom.window.document.createElement('script');
                    script.type = 'application/ld+json';
                    
                    script.innerHTML = JSON.stringify(data);
                    dom.window.document.head.appendChild(script);
                    fs.writeFileSync(filePath, dom.serialize());
                });
            }
        });
      },
  };
};