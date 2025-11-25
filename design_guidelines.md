# TN Credit Solutions - Design Guidelines

## Design Approach
**Reference-Based**: Professional financial services aesthetic drawing from industry leaders like Credit Karma, TurboTax, and modern fintech platforms. Focus on building trust, credibility, and approachability for a sensitive financial service.

## Typography System
- **Primary Font**: Inter or DM Sans (Google Fonts)
- **Headings**: Bold (700), larger scale for impact
  - H1: 3xl-5xl (mobile-desktop)
  - H2: 2xl-4xl
  - H3: xl-2xl
- **Body**: Regular (400), Medium (500) for emphasis
  - Base: text-base to text-lg
  - Small: text-sm for legal/fine print
- **Hierarchy**: Use weight and size contrast, not color, for text hierarchy

## Layout & Spacing System
- **Container**: max-w-7xl with px-4 md:px-6 lg:px-8
- **Spacing Units**: Use Tailwind units of 4, 6, 8, 12, 16, 20 consistently
  - Section padding: py-12 md:py-20 lg:py-24
  - Component gaps: gap-4, gap-6, gap-8
  - Card padding: p-6 md:p-8

## Page Structure (6-7 Sections)

### 1. Hero Section (80vh)
Full-width hero with background image showing diverse professionals or satisfied clients in consultation setting. Image should convey trust, professionalism, and personal connection.
- **Layout**: Centered content with max-w-4xl
- **Elements**: 
  - Headline emphasizing transformation ("Rebuild Your Credit, Maximize Your Returns")
  - Subheadline explaining dual service offering
  - Two prominent CTAs: "Free Consultation" (primary) + "Learn More" (secondary)
  - Trust indicators below CTAs: "1000+ Clients Helped" | "Licensed Tax Professionals" | "BBB Accredited"
  - Buttons with backdrop-blur-md bg-white/20 treatment over image
- **Image**: Professional consultation scene, warm lighting, diverse clients

### 2. Services Overview (2-Column Grid)
Split layout showcasing two core services side-by-side
- **Credit Restoration Card**: Icon, 3-4 bullet benefits, "Start Repairing" CTA
- **Tax Maximization Card**: Icon, 3-4 bullet benefits, "Optimize Taxes" CTA
- Each card: bg-white, rounded-xl, shadow-lg, p-8, hover:shadow-xl transition

### 3. How It Works (3-Step Process)
Horizontal timeline/process flow on desktop, stacked on mobile
- **Step Cards**: Numbered badges (1, 2, 3), title, description
- Visual connector lines between steps (border or decorative element)
- Icons for each step (consultation, analysis, results)

### 4. Social Proof Section
- **Layout**: 3-column testimonial grid (lg:grid-cols-3)
- **Elements per testimonial**:
  - Client photo (circular, grayscale on hover becomes color)
  - Quote text
  - Name, credential/result achieved
  - Star rating visual
- **Stats Row** above testimonials: 4-column grid showing key metrics
  - "1,000+ Clients" | "95% Success Rate" | "10+ Years" | "$2M+ Saved"

### 5. Contact Form Section (2-Column Layout)
- **Left Column**: Form with enhanced fields
  - Name, Phone, Email (add this)
  - Service Interest (dropdown: Credit Repair, Tax Services, Both)
  - Referral source (optional but trackable)
  - Message/Additional details textarea
  - Privacy notice: "We respect your privacy and never share your information"
  - Submit button: full-width, prominent
- **Right Column**: Contact information & credibility
  - Office hours: "Mon-Fri 9AM-6PM CST"
  - Phone number with click-to-call
  - Email address
  - Physical address/service areas
  - Trust badges: BBB, certifications, licenses
  - Alternative CTA: "Prefer to talk? Schedule a call"

### 6. FAQ Accordion
3-4 most common questions about credit repair and tax services in expandable format
- Questions should address concerns: "How long does credit repair take?" "Is this legal?" "What tax deductions am I missing?"

### 7. Footer (Comprehensive)
- **Multi-column layout**: Company info | Services | Resources | Contact
- Newsletter signup: "Credit Tips & Tax Strategies Monthly"
- Social proof element: "Join 5,000+ subscribers"
- Social media links
- Legal links: Privacy Policy, Terms, Disclaimer
- Copyright with current year
- Trust seals/certifications repeated

## Component Design Patterns

### Buttons
- **Primary**: Solid fill, rounded-lg, px-6 py-3, font-medium, shadow-md, subtle scale on hover
- **Secondary**: Border style, same padding, transparent bg
- **On Images**: backdrop-blur-md bg-white/20 border border-white/30

### Cards
- White backgrounds with shadow-md, rounded-xl
- Hover states: shadow-lg, subtle lift (transform)
- Consistent internal padding: p-6 or p-8
- Border option for less prominence: border border-gray-200

### Icons
- **Library**: Heroicons (outline for neutral, solid for emphasis)
- **Size**: w-6 h-6 for inline, w-12 h-12 for feature icons
- **Treatment**: Place in circular bg containers for visual consistency

### Forms
- Labels above inputs, text-sm font-medium
- Inputs: border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
- Rounded-lg corners, py-3 px-4 sizing
- Error states: border-red-500 with red text helper
- Success feedback on submission

## Images Required
1. **Hero**: Professional consultation scene (1920x1080+), warm/professional atmosphere
2. **Service Cards**: Optional icon-based graphics or small accent images
3. **Testimonials**: 3 client headshots (circular crop, professional but approachable)
4. **Trust Badges**: BBB, certifications, any licensing badges (SVG preferred)

## Accessibility Standards
- Minimum contrast ratios WCAG AA compliant
- Focus states visible on all interactive elements (ring-2 ring-blue-400)
- Form labels properly associated with inputs
- Semantic HTML hierarchy (nav, main, section, footer)
- Alt text for all images
- Keyboard navigation functional throughout

## Mobile Responsiveness
- Hero: Reduce height to 60vh on mobile, stack CTA buttons vertically
- Grids: All multi-column grids stack to single column on mobile (base)
- Typography: Reduce heading sizes by 1-2 steps on mobile
- Form: Full-width on mobile with adjusted padding
- Navigation: Hamburger menu pattern on mobile
- Touch targets: Minimum 44x44px for all interactive elements