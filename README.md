# Rotary Speakers - Speaker Pipeline Management

A dual-view web application for managing Rotary Club speaker outreach and scheduling. Track potential speakers through your pipeline with both Kanban board and spreadsheet views.

## Features

### Dual View System
- **Kanban Board**: Visual pipeline with drag-and-drop functionality across 6 stages
- **Spreadsheet View**: Sortable, filterable table with inline editing capabilities
- Seamless switching between views with data synchronization

### Speaker Pipeline Stages
1. **Ideas** - Initial speaker concepts and suggestions
2. **Approached** - Speakers who have been contacted
3. **Agreed** - Confirmed willingness to speak
4. **Scheduled** - Date and time set for presentation
5. **Spoken** - Completed presentations
6. **Dropped** - No longer pursuing

### Core Functionality
- ✅ Add, edit, and delete speakers
- ✅ Drag-and-drop between pipeline stages (Kanban view)
- ✅ Inline editing of all fields (Spreadsheet view)
- ✅ Search and filter capabilities
- ✅ Sort by any column
- ✅ Import/Export CSV files
- ✅ Automatic data persistence using browser storage
- ✅ Responsive design for all devices

### Speaker Information Fields
- Name (required)
- Email address
- Phone number
- Topic/Expertise area
- Date contacted
- Scheduled presentation date
- Notes and comments
- Status (automatically updated based on pipeline stage)

## Local Development

1. Clone or download this repository:
```bash
git clone https://github.com/yourusername/rotary-speakers.git
cd rotary-speakers
```

2. Open `index.html` in your web browser:
   - Double-click the file, or
   - Use a local web server (recommended):
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server

# Then navigate to http://localhost:8000
```

## GitHub Pages Deployment

1. Create a new repository on GitHub

2. Push the code to your repository:
```bash
git init
git add .
git commit -m "Initial commit - Rotary Speakers application"
git branch -M main
git remote add origin https://github.com/yourusername/rotary-speakers.git
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to your repository Settings
   - Navigate to "Pages" in the sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click Save

4. Your application will be available at:
   `https://yourusername.github.io/rotary-speakers/`

## Usage Instructions

### Getting Started
1. Open the application in your web browser
2. Start by clicking "+ Add Speaker" in any pipeline column
3. Fill in speaker information and save

### Kanban Board View
- **Add speakers**: Click "+ Add Speaker" in any column
- **Move speakers**: Drag and drop cards between columns
- **Edit speakers**: Click the edit icon on any card
- **Delete speakers**: Click the delete icon (confirmation required)

### Spreadsheet View
- **Add speakers**: Click "+ Add Speaker" button in the top right
- **Edit inline**: Click any cell to edit directly
- **Change status**: Use the dropdown in the Status column
- **Sort data**: Click any column header
- **Filter data**: Use the search box or status filter dropdown

### Data Management
- **Export**: Click "Export CSV" to download your speaker data
- **Import**: Click "Import CSV" to add speakers from a spreadsheet
- **Backup**: Data automatically saves to browser storage
- **Clear data**: Clear browser data/storage to reset (Settings → Privacy → Clear browsing data)

### CSV Import Format
Your CSV file should include these column headers (case-insensitive):
- Name (required)
- Email
- Phone
- Topic or Expertise
- Status
- Date Contacted
- Scheduled Date
- Notes

## Technical Details

- **Technologies**: Pure HTML, CSS, JavaScript
- **CSS Framework**: Tailwind CSS (via CDN)
- **Data Storage**: Browser localStorage
- **Browser Support**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile Support**: Fully responsive design

## Tips for Rotary Club Usage

1. **Regular Updates**: Assign one member to update the pipeline weekly
2. **Pipeline Review**: Review the pipeline at board meetings
3. **Follow-up Reminders**: Use the "Approached" column to track follow-ups needed
4. **Archive Speakers**: Keep "Spoken" speakers for future reference and potential return visits
5. **Export Regularly**: Export CSV monthly for backup and record-keeping

## Troubleshooting

**Data not saving?**
- Check that cookies/localStorage are enabled in your browser
- Try using a different browser or incognito mode

**Can't drag and drop?**
- Ensure JavaScript is enabled
- Try refreshing the page
- Check for browser extensions that might interfere

**Import not working?**
- Verify CSV format matches the required columns
- Ensure the Name field is populated for each row
- Check for special characters that might need escaping

## License

This project is provided as-is for use by Rotary Clubs and service organizations.

## Support

For issues or feature requests, please contact your club's technical administrator or create an issue in the GitHub repository.

---

Built with care for Rotary International's mission of "Service Above Self"