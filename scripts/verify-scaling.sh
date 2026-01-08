#!/bin/bash

# verify-scaling.sh - Verify auto-scaling is working correctly
# Usage: ./scripts/verify-scaling.sh

set -e

NAMESPACE="margwa"

echo "========================================="
echo "Verifying Auto-Scaling Configuration"
echo "========================================="
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Check HPA status
echo "1. Checking HPA Status..."
echo "=========================================  "
kubectl get hpa -n $NAMESPACE

echo ""
echo "2. Detailed HPA Information:"
echo "========================================="
for hpa in $(kubectl get hpa -n $NAMESPACE -o name); do
    echo ""
    echo "--- $hpa ---"
    kubectl describe $hpa -n $NAMESPACE | grep -A 10 "Metrics:"
done

echo ""
echo "3. Current Pod Counts:"
echo "========================================="
echo "| Service            | Current | Min | Max |"
echo "|--------------------|---------| ----|-----|"

for deploy in api-gateway auth-service route-service realtime-service chat-service payment-service analytics-service notification-service; do
    current=$(kubectl get deployment $deploy -n $NAMESPACE -o jsonpath='{.status.replicas}' 2>/dev/null || echo "N/A")
    hpa_name="${deploy}-hpa"
    min=$(kubectl get hpa $hpa_name -n $NAMESPACE -o jsonpath='{.spec.minReplicas}' 2>/dev/null || echo "N/A")
    max=$(kubectl get hpa $hpa_name -n $NAMESPACE -o jsonpath='{.spec.maxReplicas}' 2>/dev/null || echo "N/A")
    printf "| %-18s | %-7s | %-3s | %-3s |\n" "$deploy" "$current" "$min" "$max"
done

echo ""
echo "4. Recent Scaling Events:"
echo "========================================="
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | grep -i "scaled\|scaling" | tail -20

echo ""
echo "5. Resource Usage:"
echo "========================================="
kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics server not available. Install metrics-server to see resource usage."

echo ""
echo "6. HPA Metrics:"
echo "========================================="
for hpa in $(kubectl get hpa -n $NAMESPACE -o name); do
    hpa_name=$(echo $hpa | cut -d'/' -f2)
    echo ""
    echo "--- $hpa_name ---"
    kubectl get $hpa -n $NAMESPACE -o jsonpath='{.status.currentMetrics}' | jq '.' 2>/dev/null || echo "No metrics available"
done

echo ""
echo "========================================="
echo "Verification Complete!"
echo "========================================="
echo ""
echo "To watch HPA in real-time, run:"
echo "  kubectl get hpa -n $NAMESPACE --watch"
echo ""
echo "To simulate load and trigger scaling:"
echo "  cd scripts/load-test"
echo "  k6 run stress-test.js"
echo ""
