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
    const titleDelimiter = siteConfig.titleDelimiter;

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

    const breadcrumbHomeData = {
        '@type': 'ListItem',
        position: 1,
        item: `${baseUrl}`,
        name: 'Home',
    };

    const breadcrumbDocsData = {
        '@type': 'ListItem',
        position: 2,
        item: `${baseUrl}/docs`,
        name: 'Documentation',
    };

    const breadcrumbBlogData = {
        '@type': 'ListItem',
        position: 2,
        item: `${baseUrl}/blog`,
        name: 'Blog',
    };

    function getBreadcrumbLabel(token){
        if (structuredData.breadcrumbLabelMap.hasOwnProperty(token)){
            return structuredData.breadcrumbLabelMap[token];
        } else {
            return token;
        }
    }

    return {
    name: 'docusaurus-plugin-structured-data',
    async postBuild({siteConfig = {}, routesPaths = [], outDir}) {
        routesPaths.map((route) => {
            if(route === '/blog/tags' || route.startsWith('/blog/tags/') || route.startsWith('/blog/page/')) {
                return;
            }
            if (!['/404.html', '/search'].includes(route)) {
   
                const filePath = path.join(outDir, route, 'index.html');

                JSDOM.fromFile(filePath).then(dom => {
                    verbose ? console.log(`processing route: ${route}...`): null;                    
                   
                    if (structuredData.excludedRoutes.includes(route)){
                        verbose ? console.log(`route: ${route} is excluded`): null;
                        return;
                    }
                    
                    const webPageUrl = `${baseUrl}${route}`;
                    verbose ? console.log(`webPageUrl: ${webPageUrl}`): null;
                    const webPageTitle = dom.window.document.querySelector('title').text.replace(` ${titleDelimiter} ${orgName}`, '');
                    verbose ? console.log(`webPageTitle: ${webPageTitle}`): null;
                    const webPageDescription = dom.window.document.head.querySelector('[name~=description][content]').content;
                    verbose ? console.log(`webPageDescription: ${webPageDescription}`): null;
                    
                    //
                    // get WebPage data
                    //
                    
                    verbose ? console.log('processing web page data...'): null;

                    let webPageData = {
                        '@type': 'WebPage',
                        isPartOf: {
                            '@id': `${baseUrl}/#website`
                        },
                        ...structuredData.webpage,
                    };

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
                    
                    let breadcrumbData = {
                        '@type': 'BreadcrumbList',
                        itemListElement: [],
                    };

                    breadcrumbData['@id'] = `${webPageUrl}/#breadcrumb`;

                    // breadcrumb list element 1 is always home
                    breadcrumbData.itemListElement.push(breadcrumbHomeData);

                    const routeArray = route.split('/')
                        .slice(1, -1)
                        .map((token) => getBreadcrumbLabel(token));

                    verbose ? console.log(`route: ${route}, routeArray: ${routeArray}`): null;

                    if (routeArray.length > 0) {
                        // its a leaf page - list element 2 is the parent page
                        switch (routeArray[0]) {
                            case 'docs':
                                breadcrumbData.itemListElement.push(breadcrumbDocsData);
                                break;
                            case 'blog':
                                breadcrumbData.itemListElement.push(breadcrumbBlogData);
                                break;
                            default:
                                break;
                        }
                        if (routeArray.length > 1) {
                            // its not /docs/ or /blog/, list element 3 is the current page with ancestors
                            let pageName;
                            // for each element in routearray concatenate with |
                            routeArray.forEach((element, index) => {
                                if (['docs', 'blog'].includes(element)){
                                    return;
                                }
                                if (index === 1) {
                                    pageName = element;
                                } else {
                                    pageName = `${pageName} | ${element}`;
                                }
                            });
                            
                            pageName = `${pageName} | ${webPageTitle}`;

                            breadcrumbData.itemListElement.push(
                                {
                                    "@type": "ListItem",
                                    "position": 3,
                                    "name": `${pageName}`,
                                }
                            );                          
                        
                            verbose ? console.log(`pageName: ${pageName}`): null;

                        }      
                    } else {
                        // its a root page, link directly from home
                        breadcrumbData.itemListElement.push(
                            {
                                "@type": "ListItem",
                                "position": 2,
                                "name": `${webPageTitle}`,
                            }
                        );

                        verbose ? console.log(`pageName: ${webPageTitle}`): null;

                    }

                    //
                    // add data to graph
                    //

                    verbose ? console.log('adding data to graph...'): null;

                    let data = {};
                    data['@context'] = 'https://schema.org';
                    data['@graph'] = [];

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