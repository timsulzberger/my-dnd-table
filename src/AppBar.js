import React from 'react';

// Functional component for a Material Design-inspired App Bar (Header Bar)
// Styled using Tailwind CSS
// Props:
// - appName: String, the name of the application
// - sectionName: String, the name of the current section or menu (will be hidden on small screens)
// - onShareClick: Function, handler for the share icon click (feature to be added later)
const AppBar = ({ appName, sectionName, onShareClick }) => {

  // Tailwind classes for the main App Bar container
  // fixed top-0 left-0 right-0: Positions the app bar fixed at the top, spanning full width
  // bg-white: Sets a white background color (common in Material Design)
  // shadow-md: Adds a medium shadow for depth
  // p-4: Adds padding around the content
  // flex items-center justify-between: Uses flexbox to align items vertically in the center and distribute space between them
  const appBarClasses = `fixed top-0 left-0 right-0 bg-white shadow-md p-4 flex items-center justify-between z-10`; // Added z-10 to ensure it stays on top

  // Tailwind classes for the left section (App Name and Section Name)
  // flex items-center: Aligns children vertically in the center
  // space-x-4: Adds horizontal space between children
  const leftSectionClasses = `flex items-center space-x-4`;

  // Tailwind classes for the App Name
  // font-bold: Makes the text bold
  // text-lg: Sets the font size to large
  // text-gray-800: Sets a dark gray text color
  const appNameClasses = `font-bold text-lg text-gray-800`;

  // Tailwind classes for the Section Name
  // text-gray-600: Sets a slightly lighter gray text color
  // text-base: Sets the base font size
  // hidden sm:block: Hides the element by default, but makes it a block element on small screens and larger (responsive hiding)
  const sectionNameClasses = `text-gray-600 text-base hidden sm:block`;

  // Tailwind classes for the right section (Share Icon)
  // flex items-center: Aligns children vertically in the center
  const rightSectionClasses = `flex items-center`;

  // Tailwind classes for the Share Icon button
  // p-2: Adds padding around the icon
  // rounded-full: Makes the button round
  // hover:bg-gray-200: Changes background to a lighter gray on hover
  // active:bg-gray-300: Changes background to a slightly darker gray when clicked
  // cursor-pointer: Changes cursor to a pointer
  // text-gray-700: Sets the icon color
  // transition-colors duration-150 ease-in-out: Smooth transition for background color changes
  const shareIconClasses = `p-2 rounded-full hover:bg-gray-200 active:bg-gray-300 cursor-pointer text-gray-700 transition-colors duration-150 ease-in-out`;

  return (
    <header className={appBarClasses}>
      {/* Left Section: App Name and Section Name */}
      <div className={leftSectionClasses}>
        {/* App Name */}
        <div className={appNameClasses}>
          {appName}
        </div>
        {/* Section Name - Hidden on small screens */}
        <div className={sectionNameClasses}>
          {sectionName}
        </div>
      </div>

      {/* Right Section: Share Icon */}
      <div className={rightSectionClasses}>
        {/* Share Icon Button */}
        <button
          onClick={onShareClick} // Attach the click handler
          className={shareIconClasses}
          aria-label="Share" // Accessibility label for the button
        >
          {/* Placeholder for Share Icon (using a simple SVG inline) */}
          {/* You would typically use an icon library or a more complex SVG */}
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.4 3.2m-.67-6.4l6.4-3.2m-3.693 6.4l3.2 3.2A8.684 8.684 0 0012 17c.482 0 .938-.114 1.342-.316m-3.693-6.4l3.2-3.2A8.684 8.684 0 0112 7c.482 0 .938.114 1.342.316m0 0a3 3 0 106.4-3.2 3 3 0 10-6.4 3.2z" />
           </svg>
        </button>
      </div>
    </header>
  );
};

export default AppBar; // Export the component
