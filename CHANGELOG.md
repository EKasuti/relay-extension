# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-01-07

### Added
- **Edit & Delete Shifts**: Users can now edit or delete pending shifts directly from the Timesheet Detail view.
- **Random Shift Utility**: Refactored generator logic into a standalone utility for better maintainability.

### Fixed
- **Time Format**: Fixed issue where editing a shift didn't pre-fill the time correctly (converted 12h to 24h format).
- **Date Selection**: Enhanced random shift generator to respect specific selected dates.

## [1.1.1] - 2026-01-05

### Fixed
- **WhenToWork Parsing**: Fixed issue where time ranges combined in a single line (e.g., "10am - 12pm") were ignored.
- **NaN Hours**: Fixed regression where times without minutes (e.g., "10am") resulted in `NaN` total hours.
- **Complexity Optimization**: Optimized column grouping logic from O(M*N) to O(N) for faster parsing of large PDFs.

### Removed
- **Analytics**: Removed Google Analytics integration to ensure strict compliance with Extension CSP policies.

## [1.1.0] - 2026-01-05

### Added
- **WhenToWork Import**: Added support for importing shifts from WhenToWork schedule PDFs.
- **Improved PDF Parser**: Refactored parser to use a state machine for better handling of stacked shifts and edge cases.
- **UI Enhancements**: 
    - Separate import instructions for ConnectTeam and WhenToWork.
    - Explicit source indication on the Upload screen.
    - Updated Landing Page with "Add to Chrome" link and status badge.


## [1.0.0] - 2026-01-01

- Initial release.
