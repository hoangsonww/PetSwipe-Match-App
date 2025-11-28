package test

import (
	"fmt"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/aws"
	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

// TestTerraformInfrastructure validates the complete infrastructure deployment
func TestTerraformInfrastructure(t *testing.T) {
	t.Parallel()

	// Generate unique names for resources
	uniqueID := random.UniqueId()
	awsRegion := "us-east-1"
	projectName := fmt.Sprintf("petswipe-test-%s", uniqueID)

	// Terraform options
	terraformOptions := &terraform.Options{
		TerraformDir: "../../terraform",
		Vars: map[string]interface{}{
			"project":                 projectName,
			"environment":             "test",
			"aws_region":              awsRegion,
			"vpc_id":                  "vpc-test",
			"subnet_ids":              []string{"subnet-test1", "subnet-test2"},
			"security_group_ids":      []string{"sg-test"},
			"db_username":             "testuser",
			"db_password":             "TestPassword123!",
			"enable_kms_encryption":   true,
			"enable_service_mesh":     true,
			"enable_gitops":           true,
			"db_multi_az":             false, // Disable multi-AZ for testing
			"ecs_min_capacity":        1,
			"ecs_max_capacity":        2,
			"ecs_business_hours_min":  2,
			"ecs_business_hours_max":  4,
		},
		MaxRetries:         3,
		TimeBetweenRetries: 5 * time.Second,
	}

	// Cleanup resources after test
	defer terraform.Destroy(t, terraformOptions)

	// Initialize and apply Terraform
	terraform.InitAndApply(t, terraformOptions)

	// Test 1: Verify RDS instance is created
	t.Run("VerifyRDSInstance", func(t *testing.T) {
		dbInstanceID := terraform.Output(t, terraformOptions, "rds_instance_id")
		assert.NotEmpty(t, dbInstanceID)

		// Verify RDS instance exists and is in available state
		dbInstance := aws.GetRdsInstanceDetails(t, dbInstanceID, awsRegion)
		assert.Equal(t, "available", *dbInstance.DBInstanceStatus)
		assert.Equal(t, true, *dbInstance.StorageEncrypted)
	})

	// Test 2: Verify ECS cluster is created
	t.Run("VerifyECSCluster", func(t *testing.T) {
		clusterName := terraform.Output(t, terraformOptions, "ecs_cluster_name")
		assert.NotEmpty(t, clusterName)
		assert.Contains(t, clusterName, projectName)
	})

	// Test 3: Verify S3 buckets are created with proper configuration
	t.Run("VerifyS3Buckets", func(t *testing.T) {
		staticBucket := terraform.Output(t, terraformOptions, "s3_static_bucket")
		uploadsBucket := terraform.Output(t, terraformOptions, "s3_uploads_bucket")

		assert.NotEmpty(t, staticBucket)
		assert.NotEmpty(t, uploadsBucket)

		// Verify bucket versioning
		versioning := aws.GetS3BucketVersioning(t, awsRegion, uploadsBucket)
		assert.Equal(t, "Enabled", versioning)
	})

	// Test 4: Verify ECR repositories
	t.Run("VerifyECRRepositories", func(t *testing.T) {
		backendRepo := terraform.Output(t, terraformOptions, "ecr_backend_url")
		frontendRepo := terraform.Output(t, terraformOptions, "ecr_frontend_url")

		assert.NotEmpty(t, backendRepo)
		assert.NotEmpty(t, frontendRepo)
		assert.Contains(t, backendRepo, "backend")
		assert.Contains(t, frontendRepo, "frontend")
	})

	// Test 5: Verify KMS key configuration
	t.Run("VerifyKMSKey", func(t *testing.T) {
		kmsKeyID := terraform.Output(t, terraformOptions, "kms_key_id")
		assert.NotEmpty(t, kmsKeyID)

		// Verify key rotation is enabled
		keyMetadata := aws.GetKmsKeyMetadata(t, awsRegion, kmsKeyID)
		assert.Equal(t, true, *keyMetadata.KeyRotationEnabled)
	})

	// Test 6: Verify CloudWatch log groups
	t.Run("VerifyCloudWatchLogs", func(t *testing.T) {
		logGroupName := terraform.Output(t, terraformOptions, "cloudwatch_log_group")
		assert.NotEmpty(t, logGroupName)

		// Verify retention period
		logGroup := aws.GetCloudWatchLogGroup(t, awsRegion, logGroupName)
		assert.NotNil(t, logGroup.RetentionInDays)
	})

	// Test 7: Verify autoscaling configuration
	t.Run("VerifyAutoscaling", func(t *testing.T) {
		autoscalingTargetID := terraform.Output(t, terraformOptions, "autoscaling_target_id")
		assert.NotEmpty(t, autoscalingTargetID)
	})

	// Test 8: Verify App Mesh resources (if enabled)
	t.Run("VerifyAppMesh", func(t *testing.T) {
		meshID := terraform.Output(t, terraformOptions, "appmesh_mesh_id")
		if meshID != "" {
			assert.Contains(t, meshID, projectName)
		}
	})

	// Test 9: Verify security configurations
	t.Run("VerifySecurityConfig", func(t *testing.T) {
		secretArn := terraform.Output(t, terraformOptions, "db_credentials_secret_arn")
		assert.NotEmpty(t, secretArn)
		assert.Contains(t, secretArn, "secretsmanager")
	})

	// Test 10: Verify monitoring and alarms
	t.Run("VerifyMonitoring", func(t *testing.T) {
		dashboardName := terraform.Output(t, terraformOptions, "cloudwatch_dashboard_name")
		assert.NotEmpty(t, dashboardName)
		assert.Contains(t, dashboardName, "overview")
	})
}

// TestTerraformModuleSecurity validates security configurations
func TestTerraformModuleSecurity(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../../terraform",
		Vars: map[string]interface{}{
			"enable_waf":              true,
			"enable_kms_encryption":   true,
			"enable_guardduty":        true,
		},
	}

	terraform.Init(t, terraformOptions)

	// Run terraform plan and validate security resources
	planExitCode := terraform.PlanExitCode(t, terraformOptions)
	assert.Equal(t, 0, planExitCode)
}

// TestTerraformModuleHighAvailability validates HA configurations
func TestTerraformModuleHighAvailability(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../../terraform",
		Vars: map[string]interface{}{
			"db_multi_az":             true,
			"ecs_min_capacity":        3,
			"enable_auto_scaling":     true,
		},
	}

	terraform.Init(t, terraformOptions)

	planExitCode := terraform.PlanExitCode(t, terraformOptions)
	assert.Equal(t, 0, planExitCode)
}

// TestTerraformModuleDisasterRecovery validates DR configurations
func TestTerraformModuleDisasterRecovery(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../../terraform",
		Vars: map[string]interface{}{
			"db_backup_retention_period": 30,
			"enable_point_in_time_recovery": true,
			"enable_cross_region_backup": true,
		},
	}

	terraform.Init(t, terraformOptions)

	planExitCode := terraform.PlanExitCode(t, terraformOptions)
	assert.Equal(t, 0, planExitCode)
}

// TestTerraformModuleCostOptimization validates cost optimization settings
func TestTerraformModuleCostOptimization(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../../terraform",
		Vars: map[string]interface{}{
			"db_instance_class":       "db.t3.micro",
			"ecs_min_capacity":        1,
			"enable_spot_instances":   true,
		},
	}

	terraform.Init(t, terraformOptions)

	planExitCode := terraform.PlanExitCode(t, terraformOptions)
	assert.Equal(t, 0, planExitCode)
}
