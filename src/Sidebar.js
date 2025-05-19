import React, { useState } from 'react'; // Need useState for sub-menu state

// Functional component for a Material Design-inspired collapsible sidebar
// Accepts props for expanded state, toggle function, and unassign all handler
const Sidebar = ({ isExpanded, toggleSidebar, handleUnassignAll }) => {

  // State to manage whether the 'Edit Boats' sub-menu is open
  const [isEditBoatsSubMenuOpen, setIsEditBoatsSubMenuOpen] = useState(false);

  // Handler to toggle the 'Edit Boats' sub-menu
  const toggleEditBoatsSubMenu = () => {
    // Only toggle if the sidebar is expanded
    if (isExpanded) {
      setIsEditBoatsSubMenuOpen(!isEditBoatsSubMenuOpen);
    }
  };

  // Handler for clicking a regular menu item
  // If sidebar is collapsed, expand it. Otherwise, perform the item's action.
  const handleMenuItemClick = (action) => {
    if (!isExpanded) {
      // If collapsed, just toggle the sidebar to expand it
      toggleSidebar();
    } else {
      // If expanded, perform the action (e.g., navigate, open modal)
      // For now, we'll just log the action name
      console.log(`Clicked on: ${action}`);
      // Add specific logic here for each menu item if needed
      // e.g., if (action === 'Home') { navigate('/home'); }
      // e.g., if (action === 'Settings') { openSettingsModal(); }
    }
  };

   // Handler for clicking the "Edit Boats" menu item (which has a sub-menu)
   const handleEditBoatsClick = () => {
       if (!isExpanded) {
           // If collapsed, just toggle the sidebar to expand it
           toggleSidebar();
       } else {
           // If expanded, toggle the sub-menu
           toggleEditBoatsSubMenu();
       }
   };

   // Handler for clicking the "Unassign All" sub-menu item
   const handleUnassignAllClick = () => {
       // This action should only happen when the sidebar is expanded and the sub-menu is open.
       // The sub-menu is already conditionally rendered based on isExpanded,
       // so we just need to call the unassign handler.
       handleUnassignAll();
       console.log("Unassign All sub-menu item clicked.");
       // Optionally close the sub-menu after action
       setIsEditBoatsSubMenuOpen(false);
   };


  // Tailwind classes for the main sidebar container
  // fixed left-0 top-0 bottom-0: Positions the sidebar fixed on the left side covering full height
  // bg-gray-100: Sets a light gray background color
  // p-4: Adds padding around the content
  // flex flex-col: Arranges children vertically using flexbox
  // transition-all duration-300 ease-in-out: Adds a smooth transition effect for width changes
  // Conditional width classes: w-64 when expanded, w-16 when collapsed
  // Conditional items-center: Centers items horizontally when collapsed (Navigation Rail style)
  const sidebarClasses = `fixed left-0 top-0 bottom-0 bg-gray-100 p-4 flex flex-col transition-all duration-300 ease-in-out ${
    isExpanded ? 'w-64' : 'w-16 items-center'
  }`;

  // Tailwind classes for the main menu items
  // flex items-center: Aligns icon and text horizontally
  // py-2 px-3: Adds vertical and horizontal padding
  // rounded-md: Adds rounded corners
  // text-gray-700: Sets a plain dark gray text color
  // hover:bg-gray-200: Changes background to a lighter gray on hover
  // active:bg-gray-300: Changes background to a slightly darker gray when clicked
  // cursor-pointer: Changes cursor to a pointer on hover
  // transition-colors duration-150 ease-in-out: Smooth transition for background color changes
  const menuItemClasses = `flex items-center py-2 px-3 rounded-md text-gray-700 hover:bg-gray-200 active:bg-gray-300 cursor-pointer transition-colors duration-150 ease-in-out`;

  // Tailwind classes for sub-menu items
  // pl-8: Adds left padding to indent sub-menu items
  const subMenuItemClasses = `${menuItemClasses} pl-8`;


  return (
    <div className={sidebarClasses}>
      {/* Toggle Button */}
      {/* mb-6: Adds margin below the button */}
      {/* p-2: Padding */}
      {/* rounded-full: Makes the button round (good for an icon) */}
      {/* bg-blue-500 hover:bg-blue-600: Button background color */}
      {/* text-white: White text/icon color */}
      {/* flex items-center justify-center: Centers content inside the button */}
      {/* w-10 h-10: Fixed width and height for the button */}
      <button
        onClick={toggleSidebar} // Use the toggleSidebar prop
        className="mb-6 p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center w-10 h-10"
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'} // Accessibility label
      >
        {/* Conditionally render hamburger icon when collapsed, arrow when expanded */}
        {/* Assumes Material Icons font is available */}
        <span className="material-icons">
          {isExpanded ? 'chevron_left' : 'menu'} {/* Use 'chevron_left' or similar for collapse */}
        </span>
      </button>

      {/* Navigation Menu Items */}
      <nav className="flex flex-col space-y-2"> {/* space-y-2: Adds vertical space between menu items */}

        {/* Home Menu Item */}
        {/* Call handleMenuItemClick with the action name */}
        <div className={menuItemClasses} onClick={() => handleMenuItemClick('Home')}>
          {/* Icon for Home - always show icon */}
           <span className={`material-icons ${isExpanded ? 'mr-3' : ''}`}>home</span> {/* 'home' icon */}
          {/* Conditional display: only show text when expanded */}
          {isExpanded && <span>Home</span>}
        </div>

        {/* Edit Boats Menu Item (Parent for Sub-menu) */}
        {/* Call handleEditBoatsClick */}
        <div className={menuItemClasses} onClick={handleEditBoatsClick}>
           {/* Icon for Edit Page - always show icon */}
           <span className={`material-icons ${isExpanded ? 'mr-3' : ''}`}>edit</span> {/* 'edit' icon */}
           {/* Conditional display: only show text when expanded */}
           {isExpanded && (
             <>
               <span>Edit Boats</span> {/* Renamed text label */}
               {/* Optional: Add an arrow icon to indicate sub-menu */}
               <span className="material-icons ml-auto">
                 {isEditBoatsSubMenuOpen ? 'expand_less' : 'expand_more'}
               </span>
             </>
           )}
        </div>

        {/* Edit Boats Sub-menu */}
        {/* Conditionally render the sub-menu based on isExpanded and isEditBoatsSubMenuOpen */}
        {isExpanded && isEditBoatsSubMenuOpen && (
          <div className="flex flex-col space-y-1"> {/* space-y-1: Tighter vertical space for sub-menu items */}
            {/* Unassign All Sub-menu Item */}
            {/* Uses subMenuItemClasses for styling and calls handleUnassignAllClick */}
            <div className={subMenuItemClasses} onClick={handleUnassignAllClick}>
              {/* Optional: Add a sub-menu item icon */}
              <span className={`material-icons ${isExpanded ? 'mr-3' : ''}`}>delete</span> {/* Example icon for unassign */}
              <span>Unassign All</span> {/* Text label */}
            </div>
            {/* Add other sub-menu items under Edit Boats here */}
          </div>
        )}


        {/* Settings Menu Item */}
        {/* Call handleMenuItemClick with the action name */}
        <div className={menuItemClasses} onClick={() => handleMenuItemClick('Settings')}>
           {/* Icon for Settings - always show icon */}
           <span className={`material-icons ${isExpanded ? 'mr-3' : ''}`}>settings</span> {/* 'settings' icon */}
          {/* Conditional display: only show text when expanded */}
          {isExpanded && <span>Settings</span>}
        </div>

         {/* Account Profile Menu Item */}
         {/* Call handleMenuItemClick with the action name */}
        <div className={menuItemClasses} onClick={() => handleMenuItemClick('Account')}>
           {/* Icon for Account Profile - always show icon */}
           <span className={`material-icons ${isExpanded ? 'mr-3' : ''}`}>person</span> {/* 'person' icon */}
          {/* Conditional display: only show text when expanded */}
          {isExpanded && <span>Account</span>}
        </div>

        {/* Add more menu items as needed */}
      </nav>
    </div>
  );
};

export default Sidebar; // Export the component
