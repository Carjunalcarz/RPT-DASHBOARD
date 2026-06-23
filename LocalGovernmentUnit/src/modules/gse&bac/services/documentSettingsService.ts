import type { PRDocumentHeader, PRSignatory } from "../components/PRDocumentComponents";
import {
  DEFAULT_PR_HEADER,
  DEFAULT_PR_FOOTER_SIGNATORIES,
} from "../components/PRDocumentComponents";

const STORAGE_KEY_HEADER = "pr_document_header";
const STORAGE_KEY_FOOTER = "pr_document_footer";

export interface DocumentSettings {
  header: PRDocumentHeader;
  signatories: PRSignatory[];
}

export const loadDocumentSettings = (): DocumentSettings => {
  try {
    const headerStr = localStorage.getItem(STORAGE_KEY_HEADER);
    const footerStr = localStorage.getItem(STORAGE_KEY_FOOTER);

    return {
      header: headerStr ? JSON.parse(headerStr) : DEFAULT_PR_HEADER,
      signatories: footerStr ? JSON.parse(footerStr) : DEFAULT_PR_FOOTER_SIGNATORIES,
    };
  } catch {
    return {
      header: DEFAULT_PR_HEADER,
      signatories: DEFAULT_PR_FOOTER_SIGNATORIES,
    };
  }
};

export const saveDocumentSettings = (settings: DocumentSettings): void => {
  localStorage.setItem(STORAGE_KEY_HEADER, JSON.stringify(settings.header));
  localStorage.setItem(STORAGE_KEY_FOOTER, JSON.stringify(settings.signatories));
};

export const resetDocumentSettings = (): DocumentSettings => {
  localStorage.removeItem(STORAGE_KEY_HEADER);
  localStorage.removeItem(STORAGE_KEY_FOOTER);
  return {
    header: DEFAULT_PR_HEADER,
    signatories: DEFAULT_PR_FOOTER_SIGNATORIES,
  };
};
