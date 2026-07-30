---
name: Daily Activity Monitoring
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#414754'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#727785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005bc0'
  primary: '#005bbf'
  on-primary: '#ffffff'
  primary-container: '#1a73e8'
  on-primary-container: '#ffffff'
  inverse-primary: '#adc7ff'
  secondary: '#006b5c'
  on-secondary: '#ffffff'
  secondary-container: '#68fadd'
  on-secondary-container: '#007261'
  tertiary: '#8e4d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b26200'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc7ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#68fadd'
  secondary-fixed-dim: '#44ddc1'
  on-secondary-fixed: '#00201a'
  on-secondary-fixed-variant: '#005145'
  tertiary-fixed: '#ffdcc2'
  tertiary-fixed-dim: '#ffb77a'
  on-tertiary-fixed: '#2e1500'
  on-tertiary-fixed-variant: '#6d3a00'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style
The design system is centered on clarity, efficiency, and reliability. Designed for a professional activity monitoring context, it balances high-utility information density with a welcoming, modern interface. The style is **Corporate Modern** with a focus on precision; it utilizes generous white space, a structured grid, and subtle tonal transitions to ensure users can monitor complex data without cognitive fatigue. The emotional response is one of confidence and calm control, achieved through soft geometry and a harmonious color application.

## Colors
The palette follows a **Tonal Spot** logic, where the primary blue anchors the professional identity, while teal and amber serve as functional signifiers for progress and alerts.

- **Primary (#1A73E8):** Used for main actions, active states, and brand presence.
- **Secondary (#00BFA5):** Utilized for positive growth metrics, completion statuses, and secondary highlights.
- **Tertiary (#FF8F00):** Reserved for attention-grabbing elements like warnings, pending tasks, or high-priority notifications.
- **Neutral (#F5F7FA):** The foundation for backgrounds and subtle grouping containers, ensuring the interface remains airy.

Apply tonal variants (low-opacity fills) of the primary and secondary colors for "spot" backgrounds behind icons or active menu items to maintain a harmonious, layered look.

## Typography
The system employs a dual-font strategy. **Plus Jakarta Sans** provides a friendly yet professional character for headlines and titles, featuring a slightly wider stance that feels contemporary. **Inter** is used for all body text, data points, and labels due to its exceptional legibility at small sizes and its neutral, systematic feel. Use "label-sm" with uppercase styling for table headers and small category descriptors to provide clear visual hierarchy in data-heavy views.

## Layout & Spacing
This design system utilizes a **Fluid Grid** model with a max-width container for desktop viewing.
- **Desktop (1024px+):** 12-column grid, 24px gutters, 32px side margins.
- **Tablet (768px - 1023px):** 8-column grid, 16px gutters, 24px side margins.
- **Mobile (Up to 767px):** 4-column grid, 16px gutters, 16px side margins.

The spacing rhythm is based on a 4px baseline, with 16px (sm) being the default padding for most components and 24px (md) for section spacing.

## Elevation & Depth
Hierarchy is established using **Tonal Layers** supplemented by soft **Ambient Shadows**. 

- **Level 0 (Background):** The neutral color (#F5F7FA).
- **Level 1 (Cards/Surface):** White (#FFFFFF) with a very soft, 10% opacity primary-tinted shadow (0px 2px 8px).
- **Level 2 (Modals/Popovers):** White (#FFFFFF) with a more pronounced shadow (0px 8px 24px) and a subtle 1px border using a 10% opacity primary color.

Avoid heavy black shadows; instead, use a slight blue-grey tint in the shadow values to maintain the "Tonal Spot" aesthetic.

## Shapes
The design uses a consistent **12px (Rounded)** radius for primary containers and components. This specific value bridges the gap between rigid corporate structures and approachable consumer apps.

- **Small Components (Buttons, Inputs):** 8px (rounded-sm equivalent in context).
- **Standard Containers (Cards, Modals):** 12px (default).
- **Large Sections (Feature blocks):** 16px (rounded-lg).
- **Interactive States:** Use a subtle 2px stroke for focused inputs using the Primary Color.

## Components
- **Buttons:** Primary buttons use a solid Primary Blue fill with white text. Secondary buttons use a tonal fill (10% Primary Blue) with Primary Blue text. All buttons have an 8px corner radius.
- **Chips/Badges:** Small, 4px rounded elements. For status, use the "Tonal Spot" approach: a 15% opacity background of the status color (Teal for 'Active', Amber for 'Pending') with high-contrast text of the same hue.
- **Input Fields:** White background with a 1px border (#D1D5DB). On focus, the border transitions to Primary Blue with a soft blue glow.
- **Lists:** Clean rows with 16px vertical padding, separated by a thin 1px neutral line. Use Inter (label-lg) for list item titles.
- **Cards:** White surfaces with a 12px radius and Level 1 elevation. Group related data points using subtle background blocks in the Neutral color.
- **Progress Indicators:** Use the Secondary Teal color for "positive" progress and Primary Blue for "standard" activity tracking. High-contrast indicators ensure metrics are readable at a glance.