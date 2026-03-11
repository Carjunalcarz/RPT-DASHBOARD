
const { generateAssessmentPdf } = require('../pdf');
const { z } = require('zod');

// Schema for validation
const assessmentSchema = z.object({
  transactionCode: z.string().optional(),
  tdNo: z.string().optional(),
  arpNo: z.string().optional(),
  pin: z.string().optional(),
  owner: z.string().optional(),
  address: z.string().optional(),
  // Add other fields as needed, keeping it flexible for now
  landAppraisal: z.array(z.object({
    classification: z.string().optional(),
    subClass: z.string().optional(),
    area: z.union([z.string(), z.number()]).optional(),
    unitValue: z.union([z.string(), z.number()]).optional(),
    baseMarketValue: z.union([z.string(), z.number()]).optional(),
  })).optional(),
});

const generatePdf = async (req, res) => {
  try {
    const data = req.body;

    // Validate (optional, but good practice)
    // const validatedData = assessmentSchema.parse(data);

    const stream = await generateAssessmentPdf(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="assessment-${data.tdNo || 'sheet'}.pdf"`,
    });

    stream.pipe(res);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
};

module.exports = { generatePdf };
