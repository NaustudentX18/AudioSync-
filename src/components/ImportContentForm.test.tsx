import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImportContentForm from './ImportContentForm';

// Mocking fetch for API calls
global.fetch = vi.fn();

describe('ImportContentForm', () => {
  const mockOnAddBook = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with Write tab active by default', () => {
    render(<ImportContentForm onAddBook={mockOnAddBook} />);

    // Check tabs
    expect(screen.getByText('Write & AI Draft')).toBeInTheDocument();
    expect(screen.getByText('Local Files (.txt)')).toBeInTheDocument();
    expect(screen.getByText('Scan Page Image (AI OCR)')).toBeInTheDocument();
    expect(screen.getByText('Paste Web Link')).toBeInTheDocument();

    // Check Write tab content is visible
    expect(screen.getByPlaceholderText(/Give your script a header name/i)).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    const user = userEvent.setup();
    render(<ImportContentForm onAddBook={mockOnAddBook} />);

    // Click Local Files tab
    await user.click(screen.getByText('Local Files (.txt)'));
    expect(screen.getByText('Select Text File (.txt)')).toBeInTheDocument();

    // Click Scan tab
    await user.click(screen.getByText('Scan Page Image (AI OCR)'));
    expect(screen.getByText('Gemini Vision OCR Page Scanner')).toBeInTheDocument();

    // Click Link tab
    await user.click(screen.getByText('Paste Web Link'));
    expect(screen.getByPlaceholderText('https://journal.neilgaiman.com/...')).toBeInTheDocument();
  });

  it('shows an error if trying to save an empty or too short draft', async () => {
    const user = userEvent.setup();
    render(<ImportContentForm onAddBook={mockOnAddBook} />);

    const saveBtn = screen.getByRole('button', { name: /Save Draft to Shelf/i });

    // initially button is disabled if empty
    expect(saveBtn).toBeDisabled();

    const titleInput = screen.getByPlaceholderText(/Give your script a header name/i);
    const contentInput = screen.getByPlaceholderText(/Type or paste your custom book page/i);

    await user.type(titleInput, 'My Title');
    await user.type(contentInput, 'Too short');

    expect(saveBtn).not.toBeDisabled();

    await user.click(saveBtn);

    expect(screen.getByText('Please write at least a full sentence or paragraph before saving.')).toBeInTheDocument();
    expect(mockOnAddBook).not.toHaveBeenCalled();
  });

  it('saves a valid written draft successfully', async () => {
    const user = userEvent.setup();
    render(<ImportContentForm onAddBook={mockOnAddBook} />);

    const titleInput = screen.getByPlaceholderText(/Give your script a header name/i);
    const contentInput = screen.getByPlaceholderText(/Type or paste your custom book page/i);
    const saveBtn = screen.getByRole('button', { name: /Save Draft to Shelf/i });

    await user.type(titleInput, 'A Great Story');
    await user.type(contentInput, 'This is a much longer text that exceeds the fifteen characters minimum length for a good story.');

    await user.click(saveBtn);

    expect(screen.getByText('Draft narrative saved to library bookshelf!')).toBeInTheDocument();
    expect(mockOnAddBook).toHaveBeenCalledTimes(1);
    expect(mockOnAddBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'A Great Story',
        author: 'Author Draft',
        content: 'This is a much longer text that exceeds the fifteen characters minimum length for a good story.',
      })
    );
  });

  it('generates an AI script successfully', async () => {
    const user = userEvent.setup();
    render(<ImportContentForm onAddBook={mockOnAddBook} />);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: '# Title: AI generated epic\n\nOnce upon a time in AI world...' })
    });

    const aiInput = screen.getByPlaceholderText(/Write a custom script prompt/i);
    await user.type(aiInput, 'Write an epic');

    const generateBtn = screen.getByRole('button', { name: /Generate/i });
    await user.click(generateBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/generate-script', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ topic: 'Write an epic', style: 'engaging narration style, highly descriptive language' })
    }));

    await waitFor(() => {
      expect(screen.getByText('Beautiful AI script written for you. Edit it below or click save!')).toBeInTheDocument();
    });

    // Check if the title and content are populated correctly
    const titleInput = screen.getByPlaceholderText(/Give your script a header name/i) as HTMLInputElement;
    const contentInput = screen.getByPlaceholderText(/Type or paste your custom book page/i) as HTMLTextAreaElement;

    expect(titleInput.value).toBe('AI generated epic');
    expect(contentInput.value).toBe('Once upon a time in AI world...');
  });

  it('shows an error if AI script generation fails', async () => {
    const user = userEvent.setup();
    render(<ImportContentForm onAddBook={mockOnAddBook} />);

    (global.fetch as any).mockResolvedValueOnce({
      ok: false
    });

    const aiInput = screen.getByPlaceholderText(/Write a custom script prompt/i);
    await user.type(aiInput, 'Write an epic');

    const generateBtn = screen.getByRole('button', { name: /Generate/i });
    await user.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed server script generation request.')).toBeInTheDocument();
    });
  });

  it('handles file uploads correctly', async () => {
    const user = userEvent.setup();
    render(<ImportContentForm onAddBook={mockOnAddBook} />);

    // Click Local Files tab
    await user.click(screen.getByText('Local Files (.txt)'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const file = new File(['Hello, world! This is a test file for the text importer.'], 'test.txt', { type: 'text/plain' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Successfully parsed and saved test.txt!')).toBeInTheDocument();
    });

    expect(mockOnAddBook).toHaveBeenCalledTimes(1);
    expect(mockOnAddBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'test',
        author: 'Local File Import',
        content: 'Hello, world! This is a test file for the text importer.',
      })
    );
  });

  it('handles file upload errors correctly', async () => {
    const user = userEvent.setup();
    render(<ImportContentForm onAddBook={mockOnAddBook} />);

    // Click Local Files tab
    await user.click(screen.getByText('Local Files (.txt)'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['short'], 'short.txt', { type: 'text/plain' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('The document is empty or unreadable.')).toBeInTheDocument();
    });

    expect(mockOnAddBook).not.toHaveBeenCalled();
  });

  it('handles web link scraping correctly', async () => {
    const user = userEvent.setup();
    render(<ImportContentForm onAddBook={mockOnAddBook} />);

    await user.click(screen.getByText('Paste Web Link'));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        title: 'Scraped Article',
        author: 'Web Author',
        content: 'This is the scraped content.',
        summary: 'A short summary.'
      })
    });

    const linkInput = screen.getByPlaceholderText('https://journal.neilgaiman.com/...');
    await user.type(linkInput, 'https://example.com');

    const scrapeBtn = screen.getByRole('button', { name: /Scrape & Open Article/i });
    await user.click(scrapeBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/import-link', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com' })
    }));

    await waitFor(() => {
      expect(screen.getByText('Successfully scraped and parsed article structure!')).toBeInTheDocument();
    });

    expect(mockOnAddBook).toHaveBeenCalledTimes(1);
    expect(mockOnAddBook).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Scraped Article',
      author: 'Web Author',
      content: 'This is the scraped content.',
      summary: 'A short summary.',
    }));
  });
});
