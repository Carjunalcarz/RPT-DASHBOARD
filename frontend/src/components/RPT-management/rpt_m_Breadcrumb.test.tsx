import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RptBreadcrumb from './rpt_m_Breadcrumb';
import { User } from 'lucide-react';

describe('RptBreadcrumb', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it('renders the home link by default', () => {
    renderWithRouter(<RptBreadcrumb items={[]} />);
    
    const homeLink = screen.getByTestId('breadcrumb-home');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveTextContent('Home');
    expect(homeLink.getAttribute('href')).toBe('/');
  });

  it('renders breadcrumb items correctly', () => {
    const items = [
      { label: 'Parent', path: '/parent' },
      { label: 'Current Page' }
    ];
    
    renderWithRouter(<RptBreadcrumb items={items} />);
    
    // Check parent link
    const parentLink = screen.getByTestId('breadcrumb-link-0');
    expect(parentLink).toHaveTextContent('Parent');
    expect(parentLink.getAttribute('href')).toBe('/parent');
    
    // Check current page
    const currentPage = screen.getByTestId('breadcrumb-current-1');
    expect(currentPage).toHaveTextContent('Current Page');
    // Should not be a link
    expect(currentPage.tagName).not.toBe('A');
  });

  it('renders items with icons', () => {
    const items = [
      { label: 'User', icon: <User size={12} data-testid="user-icon" /> }
    ];
    
    renderWithRouter(<RptBreadcrumb items={items} />);
    
    const icon = screen.getByTestId('user-icon');
    expect(icon).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithRouter(<RptBreadcrumb items={[]} className="custom-class" />);
    
    // Find the nav element
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('custom-class');
  });

  it('handles empty items array', () => {
    renderWithRouter(<RptBreadcrumb items={[]} />);
    const homeLink = screen.getByTestId('breadcrumb-home');
    expect(homeLink).toBeInTheDocument();
    // No chevrons or other items
    const chevrons = document.querySelectorAll('.lucide-chevron-right');
    expect(chevrons.length).toBe(0);
  });
});
