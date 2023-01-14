const path = require('path');

module.exports = function (context) {
  const {siteConfig} = context;
  const {themeConfig} = siteConfig;
  const {structuredData} = themeConfig || {};

  // if (!structuredData) {
  //   throw new Error(
  //     `You need to specify the 'structuredData' object in 'themeConfig' to use docusaurus-plugin-structured-data`,
  //   );
  // }

  // const isProd = process.env.NODE_ENV === 'production';
  const isProd = true;


  return {
    name: 'docusaurus-plugin-structured-data',
    injectHtmlTags() {
      if (!isProd) {
        return {};
      }
      return {
        headTags: [
          {
            tagName: 'script',
            innerHTML: `
            {"text": "here"}
            `,
          },
        ],
      };
    },
  };
};