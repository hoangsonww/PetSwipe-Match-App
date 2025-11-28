import json
import boto3
import os
from datetime import datetime, timedelta
from statistics import mean
import math

cloudwatch = boto3.client('cloudwatch')
autoscaling = boto3.client('application-autoscaling')
ecs = boto3.client('ecs')

def handler(event, context):
    """
    Predictive scaling Lambda function using historical metrics
    to forecast future load and scale proactively
    """

    service_namespace = os.environ['SERVICE_NAMESPACE']
    resource_id = os.environ['RESOURCE_ID']
    scalable_dimension = os.environ['SCALABLE_DIMENSION']
    cluster_name = os.environ['CLUSTER_NAME']
    service_name = os.environ['SERVICE_NAME']

    print(f"Starting predictive scaling analysis for {service_name}")

    try:
        # Get historical metrics (last 7 days)
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=7)

        # Fetch CPU utilization metrics
        cpu_metrics = cloudwatch.get_metric_statistics(
            Namespace='AWS/ECS',
            MetricName='CPUUtilization',
            Dimensions=[
                {'Name': 'ServiceName', 'Value': service_name},
                {'Name': 'ClusterName', 'Value': cluster_name}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=300,  # 5-minute periods
            Statistics=['Average', 'Maximum']
        )

        # Fetch request count metrics
        request_metrics = cloudwatch.get_metric_statistics(
            Namespace='AWS/ApplicationELB',
            MetricName='RequestCount',
            Dimensions=[
                {'Name': 'TargetGroup', 'Value': resource_id.split('/')[-1]}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=300,
            Statistics=['Sum']
        )

        # Analyze patterns
        current_hour = datetime.utcnow().hour
        current_day = datetime.utcnow().weekday()  # 0 = Monday

        # Get historical data for same time window
        historical_cpu = [
            dp['Average']
            for dp in cpu_metrics['Datapoints']
            if dp['Timestamp'].hour == current_hour
        ]

        historical_requests = [
            dp['Sum']
            for dp in request_metrics['Datapoints']
            if dp['Timestamp'].hour == current_hour
        ]

        # Calculate prediction
        if historical_cpu and historical_requests:
            avg_cpu = mean(historical_cpu)
            avg_requests = mean(historical_requests)
            max_cpu = max(historical_cpu)

            # Predict load for next 15 minutes
            predicted_cpu = avg_cpu * 1.1  # Add 10% buffer
            predicted_requests = avg_requests * 1.1

            print(f"Predicted CPU: {predicted_cpu}%, Predicted Requests: {predicted_requests}")

            # Get current service state
            service_info = ecs.describe_services(
                cluster=cluster_name,
                services=[service_name]
            )

            current_desired = service_info['services'][0]['desiredCount']
            current_running = service_info['services'][0]['runningCount']

            # Calculate optimal task count
            optimal_count = calculate_optimal_task_count(
                predicted_cpu,
                predicted_requests,
                current_desired,
                current_day,
                current_hour
            )

            print(f"Current tasks: {current_desired}, Optimal tasks: {optimal_count}")

            # Update desired count if significant difference
            if abs(optimal_count - current_desired) >= 1:
                update_service_capacity(
                    cluster_name,
                    service_name,
                    optimal_count
                )

                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'message': 'Predictive scaling executed',
                        'current_tasks': current_desired,
                        'new_tasks': optimal_count,
                        'predicted_cpu': predicted_cpu,
                        'predicted_requests': predicted_requests
                    })
                }
            else:
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'message': 'No scaling needed',
                        'current_tasks': current_desired,
                        'predicted_cpu': predicted_cpu
                    })
                }
        else:
            print("Insufficient historical data for prediction")
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Insufficient data'})
            }

    except Exception as e:
        print(f"Error in predictive scaling: {str(e)}")
        raise

def calculate_optimal_task_count(predicted_cpu, predicted_requests, current_count, day, hour):
    """
    Calculate optimal task count based on predictions and business patterns
    """

    # Base calculation on CPU prediction
    if predicted_cpu > 80:
        scale_factor = 1.5
    elif predicted_cpu > 70:
        scale_factor = 1.3
    elif predicted_cpu > 60:
        scale_factor = 1.1
    elif predicted_cpu < 30:
        scale_factor = 0.7
    elif predicted_cpu < 40:
        scale_factor = 0.9
    else:
        scale_factor = 1.0

    # Apply business hours adjustments
    is_weekday = day < 5  # Monday-Friday
    is_business_hours = 8 <= hour <= 20

    if is_weekday and is_business_hours:
        # Peak hours - be more aggressive with scaling up
        scale_factor *= 1.2
    elif not is_weekday:
        # Weekend - scale down
        scale_factor *= 0.7

    # Calculate new count
    new_count = math.ceil(current_count * scale_factor)

    # Apply constraints
    min_count = 1 if not (is_weekday and is_business_hours) else 2
    max_count = 20

    return max(min_count, min(new_count, max_count))

def update_service_capacity(cluster, service, desired_count):
    """
    Update ECS service desired count
    """
    try:
        response = ecs.update_service(
            cluster=cluster,
            service=service,
            desiredCount=desired_count
        )
        print(f"Updated service {service} to {desired_count} tasks")
        return response
    except Exception as e:
        print(f"Error updating service: {str(e)}")
        raise
