
require('@babel/register')({
  presets: ['@babel/preset-env', '@babel/preset-react'],
  extensions: ['.jsx', '.js'],
});

const React = require('react');
const { renderToStream } = require('@react-pdf/renderer');
const AssessmentSheet = require('./templates/AssessmentSheet').default;

const generateAssessmentPdf = async (data) => {
  return await renderToStream(React.createElement(AssessmentSheet, { data }));
};

module.exports = { generateAssessmentPdf };
