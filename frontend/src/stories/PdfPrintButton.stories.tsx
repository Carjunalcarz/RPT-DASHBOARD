
import type { Meta, StoryObj } from '@storybook/react';
import { PdfPrintButton } from '../components/common/PdfPrintButton';
import React, { useRef } from 'react';

const meta: Meta<typeof PdfPrintButton> = {
  title: 'Common/PdfPrintButton',
  component: PdfPrintButton,
  tags: ['autodocs'],
  argTypes: {
    documentTitle: { control: 'text' },
    pdfEndpoint: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof PdfPrintButton>;

const MockContent = () => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="p-4 border rounded">
      <div ref={ref} className="p-8 bg-white text-black border shadow-lg" style={{ width: '210mm', minHeight: '297mm' }}>
        <h1 className="text-2xl font-bold mb-4">Mock Document</h1>
        <p>This is a mock document for printing.</p>
        <table className="w-full mt-4 border-collapse border border-black">
            <thead>
                <tr>
                    <th className="border border-black p-2">Item</th>
                    <th className="border border-black p-2">Value</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="border border-black p-2">Test Data</td>
                    <td className="border border-black p-2">123</td>
                </tr>
            </tbody>
        </table>
      </div>
      <div className="mt-4">
        <PdfPrintButton
            contentRef={ref}
            documentTitle="Mock Assessment"
            pdfEndpoint="http://localhost:3000/api/v1/pdf/generate-pdf"
            pdfData={{
                tdNo: "TD-12345",
                owner: "John Doe"
            }}
        />
      </div>
    </div>
  );
};

export const Default: Story = {
  render: () => <MockContent />,
};

export const DownloadOnly: Story = {
    render: () => (
        <PdfPrintButton
            pdfEndpoint="http://localhost:3000/api/v1/pdf/generate-pdf"
            pdfData={{ tdNo: "TD-ONLY" }}
        />
    )
};
