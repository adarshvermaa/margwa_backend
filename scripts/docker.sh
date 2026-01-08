#!/bin/bash

echo "===================================="
echo "Docker Infrastructure Management"
echo "===================================="
echo ""

# Go to parent directory
cd "$(dirname "$0")/.."

show_menu() {
    echo "Select an option:"
    echo "1. Start infrastructure (Postgres + Redis)"
    echo "2. Start all services with Docker Compose"
    echo "3. Stop all services"
    echo "4. View logs"
    echo "5. Restart services"
    echo "6. Clean up (remove volumes)"
    echo "7. Build services"
    echo "8. Exit"
    echo ""
}

while true; do
    show_menu
    read -p "Enter your choice (1-8): " choice
    
    case $choice in
        1)
            echo ""
            echo "Starting Postgres and Redis..."
            docker-compose up -d postgres redis pgadmin redis-commander
            echo ""
            echo "Infrastructure started!"
            echo "- PostgreSQL: http://localhost:5432"
            echo "- PgAdmin: http://localhost:5050"
            echo "- Redis: http://localhost:6379"
            echo "- Redis Commander: http://localhost:8081"
            echo ""
            read -p "Press Enter to continue..."
            ;;
        2)
            echo ""
            echo "Starting all services..."
            docker-compose up -d
            echo ""
            echo "All services started!"
            echo "Check status with: docker-compose ps"
            echo ""
            read -p "Press Enter to continue..."
            ;;
        3)
            echo ""
            echo "Stopping all services..."
            docker-compose down
            echo ""
            echo "All services stopped!"
            echo ""
            read -p "Press Enter to continue..."
            ;;
        4)
            echo ""
            echo "Viewing logs (Ctrl+C to exit)..."
            docker-compose logs -f
            ;;
        5)
            echo ""
            echo "Restarting all services..."
            docker-compose restart
            echo ""
            echo "All services restarted!"
            echo ""
            read -p "Press Enter to continue..."
            ;;
        6)
            echo ""
            echo "WARNING: This will remove all data!"
            read -p "Are you sure? (yes/no): " confirm
            if [ "$confirm" == "yes" ]; then
                echo "Cleaning up..."
                docker-compose down -v
                echo "Cleanup complete!"
            else
                echo "Cleanup cancelled."
            fi
            echo ""
            read -p "Press Enter to continue..."
            ;;
        7)
            echo ""
            echo "Building all services..."
            docker-compose build
            echo ""
            echo "Build complete!"
            echo ""
            read -p "Press Enter to continue..."
            ;;
        8)
            echo ""
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid choice. Try again."
            echo ""
            ;;
    esac
done
