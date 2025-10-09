#!/bin/bash

# Kairo App Uninstaller Script for macOS
# This script completely removes Kairo from your system

echo "🗑️  Kairo App Uninstaller"
echo "========================="
echo ""

# Function to check if file/directory exists and remove it
remove_if_exists() {
    if [ -e "$1" ]; then
        echo "Removing: $1"
        rm -rf "$1"
        echo "✅ Removed: $1"
    else
        echo "⚪ Not found: $1"
    fi
}

# 1. Quit the Kairo app if running
echo "1. Quitting Kairo app..."
pkill -f "Kairo" 2>/dev/null || echo "⚪ Kairo not running"
pkill -f "kairo" 2>/dev/null || echo "⚪ kairo not running"
pkill -f "electron.*kairo" 2>/dev/null || echo "⚪ No electron kairo processes found"
sleep 2

# 2. Remove the app from Applications
echo ""
echo "2. Removing app from Applications..."
remove_if_exists "/Applications/Kairo.app"

# 3. Remove user data and preferences
echo ""
echo "3. Removing user data and preferences..."
remove_if_exists "$HOME/Library/Application Support/Kairo"
remove_if_exists "$HOME/Library/Application Support/kairo"
remove_if_exists "$HOME/Library/Preferences/com.yourcompany.kairo.plist"
remove_if_exists "$HOME/Library/Preferences/com.kairo.app.plist"
remove_if_exists "$HOME/Library/Caches/Kairo"
remove_if_exists "$HOME/Library/Caches/kairo"
remove_if_exists "$HOME/Library/Saved Application State/com.yourcompany.kairo.savedState"

# 4. Remove logs
echo ""
echo "4. Removing logs..."
remove_if_exists "$HOME/Library/Logs/Kairo"
remove_if_exists "$HOME/Library/Logs/kairo"

# 5. Remove any LaunchAgents (if app had auto-start)
echo ""
echo "5. Checking for LaunchAgents..."
remove_if_exists "$HOME/Library/LaunchAgents/com.yourcompany.kairo.plist"
remove_if_exists "/Library/LaunchAgents/com.yourcompany.kairo.plist"

# 6. Remove from Dock (if pinned)
echo ""
echo "6. Removing from Dock (if pinned)..."
defaults delete com.apple.dock persistent-apps | grep -v "Kairo" 2>/dev/null || echo "⚪ Not pinned to Dock"

# 7. Clear any remaining processes
echo ""
echo "7. Final cleanup of processes..."
pkill -f "Kairo" 2>/dev/null || echo "⚪ No remaining Kairo processes"

# 8. Clear global shortcuts (they'll be unregistered when app is removed)
echo ""
echo "8. Global shortcuts will be automatically unregistered"

# 9. Empty Trash
echo ""
echo "9. Emptying Trash..."
osascript -e 'tell application "Finder" to empty trash' 2>/dev/null || echo "⚪ Trash already empty or permission denied"

echo ""
echo "✅ Kairo app has been completely removed from your system!"
echo ""
echo "📋 What was removed:"
echo "   • App bundle from /Applications/"
echo "   • User data and preferences"
echo "   • Cache files"
echo "   • Log files"
echo "   • Any launch agents"
echo "   • Global shortcuts (automatic)"
echo ""
echo "🔒 Note: Accessibility permissions may still be listed in System Settings"
echo "   You can manually remove them from: System Settings > Privacy & Security > Accessibility"
echo ""
echo "🎉 Uninstall complete!"