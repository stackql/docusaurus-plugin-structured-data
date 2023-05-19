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

    // need to build inverted index as the "name" property is not always populated for blog articles
    verbose ? console.log(`building inverted index for authors...`): null;
    const authorInvIndex = {};
    for (const [key, value] of Object.entries(structuredData.authors)) {
        authorInvIndex[value.url] = key;
    }
    verbose ? console.log(`inverted author index :\n${JSON.stringify(authorInvIndex, null, 2)}`): null;

    const orgData = {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: `${orgName}`,
        url: `${baseUrl}`,
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

            if(
                route === '/tags' || 
                route.startsWith('/tags/') || 
                route.startsWith('/page/') ||
                route === '/blog/tags' || 
                route.startsWith('/blog/tags/') || 
                route.startsWith('/blog/page/')
                ) {
                return;
            }
            
            if (!['/404.html', '/search'].includes(route)) {
   
                let filePath;
                
                if (fs.existsSync(path.join(outDir, route)) && fs.lstatSync(path.join(outDir, route)).isDirectory()) {
                    filePath = path.join(outDir, route, 'index.html');
                } else {
                    filePath = path.join(outDir, `${route}.html`);
                }

                if (!fs.existsSync(filePath)){
                    verbose ? console.log(`skipping filePath: ${filePath} (route: ${route})...`): null;
                    return;
                }

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
                    
                    // get page type and image...
                    let webPageType = 'website';
                    let webPageImage = themeConfig.image;
                    let articleAuthorUrl;
                    let articleAuthorName;
                    let articlePublishedTime;
                    let articleKeywords = [];

                    const metaNodeList = dom.window.document.querySelectorAll('meta');

                    for (const value of metaNodeList.values()) {

                        // check name attribute
                        switch(value.name){
                            case 'author':
                                articleAuthorName = value.content;
                                break;
                            case 'keywords':
                                articleKeywords = value.content.split(',');
                                break;
                            default:
                                break;
                        };
    
                        // check property attribute
                        switch(value.getAttribute('property')){
                            case 'og:type':
                                webPageType = value.content;
                                break;
                            case 'og:image':
                                webPageImage = value.content;
                                break;
                            case 'article:author':
                                articleAuthorUrl = value.content;
                                // if articleAuthorUrl contains multiple authors, only use the first one
                                articleAuthorUrl = articleAuthorUrl.split(',')[0];
                                break;
                            case 'article:published_time':
                                articlePublishedTime = value.content;
                                break;
                            default:
                                break;
                        };
                    }

                    verbose ? console.log(`webPageType: ${webPageType}`): null;
                    verbose ? console.log(`webPageImage: ${webPageImage}`): null;

                    if(webPageType === 'article'){

                        verbose ? console.log(`articleAuthorUrl: ${articleAuthorUrl}`): null;

                        if(!articleAuthorName){
                            verbose ? console.log(`articleAuthorName is not defined for route: ${route}, using inverted index`): null;
                            articleAuthorName = authorInvIndex[articleAuthorUrl];
                        }

                        verbose ? console.log(`articleAuthorName: ${articleAuthorName}`): null;
                        verbose ? console.log(`articlePublishedTime: ${articlePublishedTime}`): null;
                        verbose ? console.log(`articleKeywords: ${articleKeywords}`): null;
                    }
                    
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

                    webPageData['@id'] = `${webPageUrl}/#webpage`;
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
                        '@id': `${webPageUrl}/#breadcrumb`,
                        itemListElement: [],
                    };

                    const routeArray = route.split('/')
                        .slice(1, -1)
                        .map((token) => getBreadcrumbLabel(token));

                    verbose ? console.log(`route: ${route}, routeArray: ${routeArray}`): null;
                    
                    let pageName;
                    let elementIndex = 1;

                    // add breadcrumb ancestors

                    switch (routeArray.length) {
                        case 0:
                            // its the home page or another root level page
                            pageName = `${webPageTitle}`;
                            if (pageName !== 'Home') {
                                breadcrumbData.itemListElement.push(breadcrumbHomeData);
                                elementIndex = 2;
                            }
                            break;
                        case 1:
                            // its a top level leaf page, docs or blog
                            breadcrumbData.itemListElement.push(breadcrumbHomeData);
                            switch (routeArray[0]) {
                                case 'docs':
                                    pageName = 'Documentation';
                                    elementIndex = 2;
                                    break;
                                case 'blog':
                                    if (route === '/blog'){
                                        // its the blog index
                                        pageName = 'Blog';
                                        elementIndex = 2;
                                    } else {
                                        // its a blog post
                                        breadcrumbData.itemListElement.push(breadcrumbBlogData);
                                        pageName = `${webPageTitle}`;
                                        elementIndex = 3;
                                    }
                                    break;
                                default:
                                    break;
                            }
                            break;
                        default:
                            // its a nested (docs) leaf page
                            breadcrumbData.itemListElement.push(breadcrumbHomeData);
                            switch (routeArray[0]) {
                                case 'docs':
                                    breadcrumbData.itemListElement.push(breadcrumbDocsData);
                                    break;
                                default:
                                    break;
                            }
                            routeArray.forEach((element, index) => {
                                if (['docs'].includes(element)){
                                    return;
                                }
                                if (index === 1) {
                                    pageName = element;
                                } else {
                                    pageName = `${pageName} - ${element}`;
                                }
                            });
                            
                            pageName = `${pageName} - ${webPageTitle}`;
                            elementIndex = 3;
                            break;
                    }

                    verbose ? console.log(`pageName: ${pageName}, elementIndex: ${elementIndex}`): null;

                    // push final element (the current page)
                    let leafPageElement = {
                        '@type': 'ListItem',
                        position: elementIndex,
                        name: `${pageName}`,
                    }
                    breadcrumbData.itemListElement.push(leafPageElement);

                    // article related structured data
                    let articleData;
                    let imageObjectData;
                    let personData;

                    if(webPageType === 'article'){

                        verbose ? console.log('Adding article data...'): null;

                        // get word count
                        let wordCount = 0;
                        let paragraphs = dom.window.document.getElementsByTagName('p'); 
                        for (let i = 0; i < paragraphs.length; i++) {
                            wordCount += paragraphs[i].textContent.split(' ').length;
                        }
                        
                        // article data
                        articleData = {
                            '@type': 'Article',
                            '@id': `${webPageUrl}/#article`,
                            isPartOf: {
                                '@type': 'WebPage',
                                '@id': `${webPageUrl}/#webpage`
                            },
                            author: {
                                name: articleAuthorName,
                                '@id': `${baseUrl}/#/schema/person/${structuredData.authors[articleAuthorName].authorId}`
                            },
                            headline: webPageTitle,
                            datePublished: articlePublishedTime,
                            dateModified: articlePublishedTime,
                            mainEntityOfPage: {
                                '@id': `${webPageUrl}/#webpage`
                            },
                            wordCount: wordCount,
                            publisher: {
                                '@id': `${baseUrl}/#organization`
                            },
                            image: {
                                '@id': `${webPageUrl}/#primaryimage`
                            },
                            thumbnailUrl: `${webPageImage}`,
                            keywords: articleKeywords,
                            articleSection: [
                                "Blog",
                            ],
                            inLanguage: webPageData.inLanguage,
                        };

                        // image object data
                        imageObjectData = {
                            '@type': 'ImageObject',
                            inLanguage: webPageData.inLanguage,
                            '@id': `${webPageUrl}/#primaryimage`,
                            url: `${webPageImage}`,
                            contentUrl: `${webPageImage}`,
                            caption: `${webPageTitle}`,
                            width: structuredData.featuredImageDimensions.width,
                            height: structuredData.featuredImageDimensions.height,
                        };

                        // person data

                        verbose ? console.log(`Getting person data for ${articleAuthorName}...`): null;

                        personData = {
                            '@type': 'Person',
                            '@id': `${baseUrl}/#/schema/person/${structuredData.authors[articleAuthorName].authorId}`,
                            name: `${articleAuthorName}`,
                            image: {
                                '@type': 'ImageObject',
                                inLanguage: webPageData.inLanguage,
                                '@id': `${baseUrl}/#/schema/person/image/${structuredData.authors[articleAuthorName].authorId}`,
                                url: structuredData.authors[articleAuthorName].imageUrl,
                                contentUrl: structuredData.authors[articleAuthorName].imageUrl,
                                caption: `${articleAuthorName}`,
                                },
                            sameAs: structuredData.authors[articleAuthorName].sameAs,
                            url: `${articleAuthorUrl}`,
                        }
                            
                    };

                    //
                    // add data to graph
                    //

                    verbose ? console.log('adding data to graph...'): null;

                    let data = {};
                    data['@context'] = 'https://schema.org';
                    data['@graph'] = [];


                    if(webPageType === 'article'){
                        data['@graph'].push(articleData);
                        data['@graph'].push(webPageData);
                        data['@graph'].push(imageObjectData);
                        data['@graph'].push(breadcrumbData);
                        data['@graph'].push(webSiteData);
                        data['@graph'].push(orgData);
                        articleAuthorName ? data['@graph'].push(personData): null;
                    } else {
                        data['@graph'].push(webPageData);
                        data['@graph'].push(breadcrumbData);
                        data['@graph'].push(webSiteData);
                        data['@graph'].push(orgData);
                    }

                    let script = dom.window.document.createElement('script');
                    script.type = 'application/ld+json';
                    
                    script.innerHTML = JSON.stringify(data);
                    dom.window.document.head.appendChild(script);

                    // find and remove breadcrumb microdata
                    let breadcrumbMicrodata = dom.window.document.querySelector('ul[itemtype="https://schema.org/BreadcrumbList"]');
                    if(breadcrumbMicrodata){
                        // remove itemtype and itemscope property from node
                        breadcrumbMicrodata.removeAttribute('itemtype');
                        breadcrumbMicrodata.removeAttribute('itemscope');
                    }

                    let breadcrumbListItemMicrodata = dom.window.document.querySelector('li[itemtype="https://schema.org/ListItem"]');
                    if(breadcrumbListItemMicrodata){
                        // remove itemtype and itemscope property from node
                        breadcrumbListItemMicrodata.removeAttribute('itemtype');
                        breadcrumbListItemMicrodata.removeAttribute('itemscope');
                        breadcrumbListItemMicrodata.removeAttribute('itemprop');
                    }

                    // find and remove <meta itemprop="position" ..>, excess baggage with JSON-LD breadcrumb data
                    let breadcrumbPositionMeta = dom.window.document.querySelectorAll('meta[itemprop="position"]');
                    if(breadcrumbPositionMeta){
                        breadcrumbPositionMeta.forEach((element) => {
                            element.remove();
                        });
                    }

                    fs.writeFileSync(filePath, dom.serialize());
                });
            }
        });
      },
  };
};