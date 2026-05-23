import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { synthesizeElevenLabs } from './speech';

describe('synthesizeElevenLabs', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw an error if API key is missing', async () => {
    await expect(synthesizeElevenLabs('Hello', 'voice_123', ''))
      .rejects.toThrow('ElevenLabs API Key is missing. Add your key in the Speech Settings.');

    await expect(synthesizeElevenLabs('Hello', 'voice_123', '   '))
      .rejects.toThrow('ElevenLabs API Key is missing. Add your key in the Speech Settings.');
  });

  it('should return a valid object URL on successful API response', async () => {
    const mockBlob = new Blob(['dummy audio data'], { type: 'audio/mpeg' });
    const mockObjectURL = 'blob:http://localhost/1234-5678';

    // Mock fetch
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Mock URL.createObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue(mockObjectURL);
    vi.stubGlobal('URL', { createObjectURL: createObjectURLMock });

    const result = await synthesizeElevenLabs('Hello World', 'voice_123', 'valid_api_key');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.elevenlabs.io/v1/text-to-speech/voice_123',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': 'valid_api_key',
        },
        body: JSON.stringify({
          text: 'Hello World',
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      })
    );

    expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob);
    expect(result).toBe(mockObjectURL);
  });

  it('should throw an error with the server message when the API response is not OK', async () => {
    // Mock fetch to return a non-OK response with error details
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({
        detail: { message: 'Invalid API key' }
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(synthesizeElevenLabs('Hello', 'voice_123', 'invalid_key'))
      .rejects.toThrow('ElevenLabs API Error: Invalid API key (Status: 401)');
  });

  it('should throw a fallback error message when the API response is not OK and error JSON is missing/invalid', async () => {
    // Mock fetch to return a non-OK response without valid JSON error details
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Failed to parse JSON')),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(synthesizeElevenLabs('Hello', 'voice_123', 'valid_key'))
      .rejects.toThrow('ElevenLabs API Error: Unknown API issue (Status: 500)');
  });
});
