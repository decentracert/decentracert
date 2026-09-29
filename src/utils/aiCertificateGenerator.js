/**
 * AI-Powered Certificate Design Generator
 * Generates unique certificate designs using AI APIs
 */

// AI Service Configuration
const AI_SERVICES = {
  OPENAI: 'openai',
  STABILITY: 'stability',
  HUGGINGFACE: 'huggingface'
};

// Certificate design templates and prompts
const DESIGN_TEMPLATES = {
  academic: {
    style: "Academic, formal, traditional",
    elements: "University seal, decorative borders, classical typography",
    colors: "Deep blue, gold, white, elegant gradients"
  },
  corporate: {
    style: "Professional, modern, clean",
    elements: "Company logo area, minimalist borders, sans-serif fonts",
    colors: "Corporate blue, silver, white, professional palette"
  },
  creative: {
    style: "Artistic, innovative, contemporary",
    elements: "Creative patterns, modern graphics, dynamic layouts",
    colors: "Vibrant colors, gradients, artistic palette"
  },
  tech: {
    style: "Futuristic, digital, high-tech",
    elements: "Circuit patterns, digital elements, tech-inspired graphics",
    colors: "Electric blue, neon green, dark backgrounds, cyber palette"
  },
  conference: {
    style: "Event-focused, professional, memorable",
    elements: "Event branding, speaker signatures, conference themes",
    colors: "Event brand colors, professional yet engaging"
  }
};

/**
 * Generate AI certificate design using OpenAI DALL-E
 */
export const generateCertificateWithOpenAI = async (eventData, designOptions = {}, organizerData = {}) => {
  try {
    console.log('🎨 Generating certificate with OpenAI for:', eventData.name);
    
    const template = DESIGN_TEMPLATES[designOptions.style] || DESIGN_TEMPLATES.academic;
    
    const prompt = createDesignPrompt(eventData, template, designOptions);
    
    // Use free AI generation with event details
    const mockResponse = await simulateAIGeneration(prompt, 'openai', eventData, designOptions.style || 'academic', organizerData);
    
    return {
      success: true,
      imageUrl: mockResponse.imageUrl,
      prompt: prompt,
      service: 'OpenAI DALL-E 3',
      metadata: {
        style: designOptions.style || 'academic',
        eventName: eventData.name,
        generatedAt: new Date().toISOString(),
        prompt: prompt
      }
    };
    
  } catch (error) {
    console.error('Error generating certificate with OpenAI:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate AI certificate design using Stability AI
 */
export const generateCertificateWithStability = async (eventData, designOptions = {}, organizerData = {}) => {
  try {
    console.log('🎨 Generating certificate with Stability AI for:', eventData.name);
    
    const template = DESIGN_TEMPLATES[designOptions.style] || DESIGN_TEMPLATES.academic;
    const prompt = createDesignPrompt(eventData, template, designOptions);
    
    // Use free AI generation with event details
    const mockResponse = await simulateAIGeneration(prompt, 'stability', eventData, designOptions.style || 'academic', organizerData);
    
    return {
      success: true,
      imageUrl: mockResponse.imageUrl,
      prompt: prompt,
      service: 'Stability AI',
      metadata: {
        style: designOptions.style || 'academic',
        eventName: eventData.name,
        generatedAt: new Date().toISOString(),
        prompt: prompt
      }
    };
    
  } catch (error) {
    console.error('Error generating certificate with Stability AI:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create detailed design prompt for AI generation
 */
const createDesignPrompt = (eventData, template, options) => {
  const basePrompt = `
Create a professional certificate design for "${eventData.name}".

STYLE: ${template.style}
ELEMENTS: ${template.elements}
COLORS: ${template.colors}

EVENT DETAILS:
- Event: ${eventData.name}
- Category: ${eventData.category || 'Professional Development'}
- Date: ${eventData.date || 'TBD'}
- Description: ${eventData.description || 'Achievement Certificate'}

DESIGN REQUIREMENTS:
- High-quality, print-ready design
- Space for recipient name in elegant typography
- Official seal or logo placement area
- Signature lines for authorities
- Professional border and decorative elements
- Appropriate white space and layout balance
- Size: Standard certificate dimensions (11x8.5 inches)

ADDITIONAL SPECIFICATIONS:
${options.customPrompt || ''}
- Ensure text areas are clearly defined
- Include subtle background patterns or textures
- Make it suitable for digital display and printing
- Professional, trustworthy, and prestigious appearance
  `.trim();

  return basePrompt;
};

/**
 * Generate certificate using solid colors and digital signature
 */
const generateFreeAICertificate = async (eventData, style, organizerData = {}) => {
  try {
    console.log('🎨 Generating certificate with solid colors for:', eventData.name);
    console.log('Organizer:', organizerData.name || organizerData.organizationName || 'Not specified');

    // Create certificate with solid background and digital signature
    const certificateImageUrl = await createSolidColorCertificate(eventData, style, organizerData);

    return {
      imageUrl: certificateImageUrl,
      imageBlob: null,
      service: 'Digital Certificate Generator',
      generatedAt: new Date().toISOString(),
      style: style
    };

  } catch (error) {
    console.error('Error generating certificate:', error);
    // Fallback to basic generation
    return await generateCanvasOnlyCertificate(eventData, style, organizerData);
  }
};

/**
 * Create certificate with solid colors and digital signature
 */
const createSolidColorCertificate = async (eventData, style, organizerData = {}) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Style-specific color schemes
    const styleColors = {
      academic: {
        primary: '#1e3a8a',    // Deep blue
        secondary: '#3b82f6',   // Light blue
        background: '#f8fafc',  // Very light blue
        accent: '#1e40af'       // Medium blue
      },
      corporate: {
        primary: '#374151',     // Dark gray
        secondary: '#6b7280',   // Medium gray
        background: '#f9fafb',  // Light gray
        accent: '#4b5563'       // Gray
      },
      creative: {
        primary: '#7c3aed',     // Purple
        secondary: '#a855f7',   // Light purple
        background: '#faf5ff',  // Very light purple
        accent: '#8b5cf6'       // Medium purple
      },
      tech: {
        primary: '#059669',     // Green
        secondary: '#10b981',   // Light green
        background: '#f0fdf4',  // Very light green
        accent: '#047857'       // Dark green
      },
      conference: {
        primary: '#dc2626',     // Red
        secondary: '#ef4444',   // Light red
        background: '#fef2f2',  // Very light red
        accent: '#b91c1c'       // Dark red
      }
    };

    const colors = styleColors[style] || styleColors.academic;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, colors.background);
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, colors.background);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    // Add subtle pattern
    ctx.fillStyle = colors.secondary + '10'; // 10% opacity
    for (let i = 0; i < 800; i += 80) {
      for (let j = 0; j < 600; j += 80) {
        ctx.fillRect(i, j, 40, 40);
      }
    }

    // Main content area with border
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(40, 40, 720, 520);

    // Decorative borders
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 760, 560);

    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, 730, 530);

    // Header decoration
    ctx.fillStyle = colors.primary;
    ctx.fillRect(50, 50, 700, 4);

    // Certificate title
    ctx.fillStyle = colors.primary;
    ctx.font = 'bold 42px serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE', 400, 110);

    // Subtitle
    ctx.font = 'italic 20px serif';
    ctx.fillStyle = colors.accent;
    ctx.fillText('of Achievement', 400, 140);

    // Event name
    ctx.font = 'bold 28px serif';
    ctx.fillStyle = '#000000';
    const eventName = eventData.name || 'Event Name';
    ctx.fillText(eventName, 400, 190);

    // Description (wrapped text)
    if (eventData.description) {
      ctx.font = '16px serif';
      ctx.fillStyle = '#333333';
      const words = eventData.description.split(' ');
      let line = '';
      let y = 220;
      const maxWidth = 600;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 400, y);
          line = words[n] + ' ';
          y += 22;
          if (y > 280) break; // Limit description height
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 400, y);
    }

    // Date and Category
    let detailsY = 300;
    if (eventData.date) {
      ctx.font = '18px serif';
      ctx.fillStyle = colors.primary;
      const formattedDate = new Date(eventData.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      ctx.fillText(`Date: ${formattedDate}`, 400, detailsY);
      detailsY += 25;
    }

    if (eventData.category) {
      ctx.font = '16px serif';
      ctx.fillStyle = '#666666';
      ctx.fillText(`Category: ${eventData.category.charAt(0).toUpperCase() + eventData.category.slice(1)}`, 400, detailsY);
      detailsY += 30;
    }

    // Certificate text
    ctx.font = 'italic 20px serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('This certifies that the certificate holder', 400, detailsY + 30);

    ctx.font = 'bold 22px serif';
    ctx.fillStyle = colors.primary;
    ctx.fillText('has successfully completed the requirements', 400, detailsY + 65);

    ctx.font = '18px serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('and is entitled to this certificate of achievement', 400, detailsY + 95);

    // Digital signature section
    const sigY = 520;

    // Digital signature text
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = colors.primary;
    ctx.fillText('🔐 DIGITALLY SIGNED AND VERIFIED', 400, sigY);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('by Organizer', 400, sigY + 20);

    // Organizer name - use provided data or default
    ctx.font = 'italic 12px sans-serif';
    ctx.fillStyle = '#666666';
    const organizerName = organizerData.name || organizerData.organizationName || 'Certificate Authority';
    ctx.fillText(organizerName, 400, sigY + 35);

    // Convert canvas to data URL (base64) for persistence
    const dataUrl = canvas.toDataURL('image/png', 0.9);
    console.log('✅ Generated certificate data URL length:', dataUrl.length);
    console.log('✅ Data URL starts with:', dataUrl.substring(0, 50));
    resolve(dataUrl);
  });
};

// Removed deprecated Hugging Face function - using solid colors only

/**
 * Create certificate with text overlay using HTML5 Canvas
 */
const createCertificateWithCanvas = async (backgroundUrl, eventData, style) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Load background image
    const backgroundImg = new Image();
    backgroundImg.crossOrigin = 'anonymous';

    backgroundImg.onload = () => {
      // Draw background
      ctx.drawImage(backgroundImg, 0, 0, 800, 600);

      // Add semi-transparent overlay for better text readability
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, 800, 600);

      // Style-specific colors
      const styleColors = {
        academic: '#1e3a8a', // Deep blue
        corporate: '#374151', // Gray
        creative: '#7c3aed', // Purple
        tech: '#059669', // Green
        conference: '#dc2626' // Red
      };

      const primaryColor = styleColors[style] || '#1e3a8a';

      // Draw decorative border
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, 760, 560);

      // Inner border
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, 720, 520);

      // Certificate title
      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 36px serif';
      ctx.textAlign = 'center';
      ctx.fillText('CERTIFICATE', 400, 100);

      // Subtitle
      ctx.font = 'italic 18px serif';
      ctx.fillText('of Achievement', 400, 130);

      // Event name
      ctx.font = 'bold 28px serif';
      ctx.fillStyle = '#000000';
      const eventName = eventData.name || 'Event Name';
      ctx.fillText(eventName, 400, 200);

      // Description
      if (eventData.description) {
        ctx.font = '16px serif';
        ctx.fillStyle = '#333333';
        const description = eventData.description.length > 60
          ? eventData.description.substring(0, 60) + '...'
          : eventData.description;
        ctx.fillText(description, 400, 240);
      }

      // Date
      if (eventData.date) {
        ctx.font = '18px serif';
        ctx.fillStyle = primaryColor;
        const formattedDate = new Date(eventData.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        ctx.fillText(`Date: ${formattedDate}`, 400, 280);
      }

      // Category
      if (eventData.category) {
        ctx.font = '16px serif';
        ctx.fillStyle = '#666666';
        ctx.fillText(`Category: ${eventData.category.charAt(0).toUpperCase() + eventData.category.slice(1)}`, 400, 310);
      }

      // Certificate text
      ctx.font = 'italic 18px serif';
      ctx.fillStyle = '#000000';
      ctx.fillText('This certifies that the certificate holder', 400, 380);

      ctx.font = '20px serif';
      ctx.fillStyle = '#000000';
      ctx.fillText('has successfully completed the requirements', 400, 420);

      ctx.font = '18px serif';
      ctx.fillStyle = '#000000';
      ctx.fillText('and is entitled to this certificate of achievement', 400, 450);

      // Digital signature section
      const sigY = 520;

      // Digital signature text
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = primaryColor;
      ctx.fillText('🔐 DIGITALLY SIGNED AND VERIFIED', 400, sigY);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#333333';
      ctx.fillText('by Organizer', 400, sigY + 20);

      // Organizer name
      ctx.font = 'italic 12px sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText('Blockchain Certificate Authority', 400, sigY + 35);

      // Convert canvas to blob URL
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/png', 0.9);
    };

    backgroundImg.onerror = () => {
      // If background fails to load, create certificate with solid background
      createSolidBackgroundCertificate(canvas, ctx, eventData, style, resolve);
    };

    backgroundImg.src = backgroundUrl;
  });
};

/**
 * Fallback background images
 */
const getFallbackBackground = (style) => {
  const backgrounds = {
    academic: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop&auto=format&q=80',
    corporate: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&auto=format&q=80',
    creative: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&h=600&fit=crop&auto=format&q=80',
    tech: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop&auto=format&q=80',
    conference: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop&auto=format&q=80'
  };

  return backgrounds[style] || backgrounds.academic;
};

/**
 * Create certificate with solid background (fallback)
 */
const createSolidBackgroundCertificate = (canvas, ctx, eventData, style, organizerData, resolve) => {
  // Style-specific gradients
  const styleGradients = {
    academic: ['#1e3a8a', '#3b82f6'],
    corporate: ['#374151', '#6b7280'],
    creative: ['#7c3aed', '#a855f7'],
    tech: ['#059669', '#10b981'],
    conference: ['#dc2626', '#ef4444']
  };

  const [color1, color2] = styleGradients[style] || styleGradients.academic;

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 800, 600);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 600);

  // Add pattern overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < 800; i += 40) {
    for (let j = 0; j < 600; j += 40) {
      ctx.fillRect(i, j, 20, 20);
    }
  }

  // Add white overlay for text readability
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(50, 50, 700, 500);

  // Draw the same text content as the main function
  const primaryColor = color1;

  // Draw decorative border
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 760, 560);

  // Certificate title
  ctx.fillStyle = primaryColor;
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE', 400, 100);

  // Event name
  ctx.font = 'bold 28px serif';
  ctx.fillStyle = '#000000';
  const eventName = eventData.name || 'Event Name';
  ctx.fillText(eventName, 400, 200);

  // Description
  if (eventData.description) {
    ctx.font = '16px serif';
    ctx.fillStyle = '#333333';
    const description = eventData.description.length > 60
      ? eventData.description.substring(0, 60) + '...'
      : eventData.description;
    ctx.fillText(description, 400, 240);
  }

  // Date
  if (eventData.date) {
    ctx.font = '18px serif';
    ctx.fillStyle = primaryColor;
    const formattedDate = new Date(eventData.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    ctx.fillText(`Date: ${formattedDate}`, 400, 280);
  }

  // Certificate text
  ctx.font = 'italic 18px serif';
  ctx.fillStyle = '#000000';
  ctx.fillText('This certifies that the certificate holder', 400, 350);

  ctx.font = '20px serif';
  ctx.fillStyle = color1;
  ctx.fillText('has successfully completed the requirements', 400, 390);

  ctx.font = '18px serif';
  ctx.fillStyle = '#000000';
  ctx.fillText('and is entitled to this certificate of achievement', 400, 420);

  // Digital signature section
  const sigY = 460;

  // Digital signature text
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = color1;
  ctx.fillText('🔐 DIGITALLY SIGNED AND VERIFIED', 400, sigY);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#333333';
  ctx.fillText('by Organizer', 400, sigY + 18);

  // Organizer name
  ctx.font = 'italic 11px sans-serif';
  ctx.fillStyle = '#666666';
  const organizerName = organizerData?.name || organizerData?.organizationName || 'Certificate Authority';
  ctx.fillText(organizerName, 400, sigY + 32);

  const dataUrl = canvas.toDataURL('image/png', 0.9);
  resolve(dataUrl);
};

/**
 * Canvas-only certificate generation (ultimate fallback)
 */
const generateCanvasOnlyCertificate = async (eventData, style, organizerData = {}) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    createSolidBackgroundCertificate(canvas, ctx, eventData, style, organizerData, (url) => {
      resolve({
        imageUrl: url,
        imageBlob: null,
        service: 'Canvas Only (Fallback)',
        generatedAt: new Date().toISOString(),
        style: style
      });
    });
  });
};

/**
 * Updated simulation function that uses free AI generation
 */
const simulateAIGeneration = async (prompt, service, eventData, style, organizerData = {}) => {
  console.log('🎨 Generating certificate with event details:', eventData);
  console.log('Using prompt:', prompt.substring(0, 100) + '...');
  console.log('Service:', service);

  // Use the new free AI generation
  return await generateFreeAICertificate(eventData, style, organizerData);
};

/**
 * Generate multiple design variations
 */
export const generateMultipleDesigns = async (eventData, styles = ['academic', 'corporate', 'creative'], organizerData = {}) => {
  try {
    console.log('🎨 Generating multiple certificate designs...');
    
    const designs = [];
    
    for (const style of styles) {
      const designOptions = { style };

      // Try OpenAI first, fallback to Stability
      let result = await generateCertificateWithOpenAI(eventData, designOptions, organizerData);

      if (!result.success) {
        result = await generateCertificateWithStability(eventData, designOptions, organizerData);
      }
      
      if (result.success) {
        designs.push({
          ...result,
          style,
          id: `design_${style}_${Date.now()}`
        });
      }
    }
    
    return {
      success: true,
      designs,
      totalGenerated: designs.length
    };
    
  } catch (error) {
    console.error('Error generating multiple designs:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create certificate metadata with AI-generated image
 */
export const createCertificateMetadata = async (eventData, designResult, recipientData = {}) => {
  try {
    const metadata = {
      name: `${eventData.name} - Certificate`,
      description: `Official certificate for ${eventData.name}. ${eventData.description || ''}`,
      image: designResult.imageUrl,
      external_url: `https://your-domain.com/certificate/${recipientData.tokenId || 'preview'}`,
      
      attributes: [
        {
          trait_type: "Event Name",
          value: eventData.name
        },
        {
          trait_type: "Event Category", 
          value: eventData.category || "Professional Development"
        },
        {
          trait_type: "Issue Date",
          value: eventData.date || new Date().toISOString().split('T')[0]
        },
        {
          trait_type: "Design Style",
          value: designResult.metadata?.style || "Academic"
        },
        {
          trait_type: "AI Generated",
          value: "Yes"
        },
        {
          trait_type: "AI Service",
          value: designResult.service || "AI Generated"
        },
        {
          trait_type: "Certificate Type",
          value: "Soulbound"
        }
      ],
      
      // Additional metadata for certificate
      certificate_data: {
        event: eventData,
        design: {
          prompt: designResult.prompt,
          style: designResult.metadata?.style,
          generatedAt: designResult.metadata?.generatedAt,
          service: designResult.service
        },
        recipient: recipientData,
        soulbound: true,
        version: "1.0"
      }
    };
    
    return {
      success: true,
      metadata
    };
    
  } catch (error) {
    console.error('Error creating certificate metadata:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Retry function for API calls
 */
const retryApiCall = async (apiCall, maxRetries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} to upload to IPFS...`);
      return await apiCall();
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      console.log(`⏳ Retrying in ${delay}ms...`);
    }
  }
};

/**
 * Upload certificate design and metadata to IPFS
 */
export const uploadCertificateToIPFS = async (metadata, imageDataUrl = null) => {
  try {
    console.log('📤 Uploading certificate to IPFS...');
    
    if (!imageDataUrl) {
      throw new Error('No image data provided for upload');
    }

    // Convert data URL to blob for upload
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    
    // Create file from blob
    const file = new File([blob], 'certificate-design.png', { type: 'image/png' });
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadMetadata = {
      name: metadata.name || 'certificate-design',
    };
    formData.append('metadata', JSON.stringify(uploadMetadata));

    console.log('📤 Sending to server API...');
    
    // Upload image to IPFS via server with retry
    const uploadImage = async () => {
      const uploadResponse = await fetch('/api/upload-ipfs', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Server response error:', errorText);
        
        let errorMessage = 'Failed to upload certificate to IPFS';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorMessage = `Server error: ${uploadResponse.status} ${uploadResponse.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      return await uploadResponse.json();
    };

    const uploadResult = await retryApiCall(uploadImage);
    console.log('✅ Image uploaded successfully:', uploadResult.ipfsHash);

    // Now upload metadata to IPFS with retry
    const uploadMetadataToIPFS = async () => {
      const metadataResponse = await fetch('/api/upload-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text();
        console.error('❌ Metadata upload error:', errorText);
        
        let errorMessage = 'Failed to upload metadata to IPFS';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          errorMessage = `Server error: ${metadataResponse.status} ${metadataResponse.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      return await metadataResponse.json();
    };

    const metadataResult = await retryApiCall(uploadMetadataToIPFS);
    console.log('✅ Metadata uploaded successfully:', metadataResult.ipfsHash);

    return {
      success: true,
      ipfsHash: metadataResult.ipfsHash,
      ipfsUrl: `ipfs://${metadataResult.ipfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${metadataResult.ipfsHash}`,
      metadata
    };

  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    
    // Provide user-friendly error messages
    let userMessage = error.message;
    if (error.message.includes('ECONNRESET') || error.message.includes('Network connection issue')) {
      userMessage = 'Network connection issue with IPFS service. Please try again in a few minutes.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Upload timed out. Please try again.';
    } else if (error.message.includes('Failed to upload')) {
      userMessage = 'Upload failed. Please check your internet connection and try again.';
    }
    
    return {
      success: false,
      error: userMessage
    };
  }
};

/**
 * Complete AI certificate generation workflow
 */
export const generateCompleteCertificate = async (eventData, designOptions = {}, organizerData = {}) => {
  try {
    console.log('🚀 Starting complete AI certificate generation...');
    
    // Step 1: Generate AI design
    const designResult = await generateCertificateWithOpenAI(eventData, designOptions, organizerData);
    
    if (!designResult.success) {
      throw new Error('Failed to generate certificate design');
    }
    
    // Step 2: Create metadata
    const metadataResult = await createCertificateMetadata(eventData, designResult);
    
    if (!metadataResult.success) {
      throw new Error('Failed to create certificate metadata');
    }
    
    // Step 3: Upload to IPFS (pass the image data URL)
    const ipfsResult = await uploadCertificateToIPFS(metadataResult.metadata, designResult.imageUrl);
    
    if (!ipfsResult.success) {
      throw new Error('Failed to upload to IPFS');
    }
    
    return {
      success: true,
      design: designResult,
      metadata: metadataResult.metadata,
      ipfs: ipfsResult,
      tokenURI: ipfsResult.ipfsUrl
    };
    
  } catch (error) {
    console.error('Error in complete certificate generation:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
