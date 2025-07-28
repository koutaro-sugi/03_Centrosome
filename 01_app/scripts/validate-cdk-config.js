/**
 * CDK設定の検証スクリプト
 * DynamoDBテーブル設定とAmplify統合の検証
 */

const fs = require('fs');
const path = require('path');

/**
 * Amplifyデータリソース設定の検証
 */
function validateDataResource() {
  console.log('=== Amplify Data Resource 検証 ===');
  
  const dataResourcePath = path.join(__dirname, '../amplify/data/resource.ts');
  
  if (!fs.existsSync(dataResourcePath)) {
    console.error('❌ data/resource.ts が見つかりません');
    return false;
  }
  
  const content = fs.readFileSync(dataResourcePath, 'utf8');
  
  // 必要な設定項目をチェック
  const checks = [
    {
      name: 'CentraSensorDataモデル定義',
      pattern: /CentraSensorData:\s*a\.model\(/,
      required: true
    },
    {
      name: 'パーティションキー（PK）',
      pattern: /PK:\s*a\.string\(\)\.required\(\)/,
      required: true
    },
    {
      name: 'ソートキー（SK）',
      pattern: /SK:\s*a\.string\(\)\.required\(\)/,
      required: true
    },
    {
      name: 'TTL属性',
      pattern: /ttl:\s*a\.integer\(\)\.required\(\)/,
      required: true
    },
    {
      name: 'データタイプ列挙',
      pattern: /type:\s*a\.enum\(\['RAW',\s*'STATS_10MIN'\]\)/,
      required: true
    },
    {
      name: 'GSI設定',
      pattern: /\.secondaryIndexes\(/,
      required: true
    },
    {
      name: 'deviceId-timestamp GSI',
      pattern: /index\('deviceId'\)\.sortKeys\(\['timestamp'\]\)/,
      required: true
    }
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    const found = check.pattern.test(content);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    
    if (check.required && !found) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

/**
 * DynamoDB設定ファイルの検証
 */
function validateDynamoDBConfig() {
  console.log('\n=== DynamoDB設定ファイル検証 ===');
  
  const dynamoConfigPath = path.join(__dirname, '../amplify/backend/dynamodb/resource.ts');
  
  if (!fs.existsSync(dynamoConfigPath)) {
    console.error('❌ backend/dynamodb/resource.ts が見つかりません');
    return false;
  }
  
  const content = fs.readFileSync(dynamoConfigPath, 'utf8');
  
  const checks = [
    {
      name: 'configureSensorDataTable関数',
      pattern: /export function configureSensorDataTable/,
      required: true
    },
    {
      name: 'TTL設定',
      pattern: /addTimeToLiveAttribute/,
      required: true
    },
    {
      name: 'Point-in-time recovery設定',
      pattern: /PointInTimeRecoverySpecification/,
      required: true
    },
    {
      name: 'テーブル設定メタデータ',
      pattern: /createSensorDataTableConfiguration/,
      required: true
    },
    {
      name: 'モニタリング設定',
      pattern: /addTableMonitoring/,
      required: true
    }
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    const found = check.pattern.test(content);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    
    if (check.required && !found) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

/**
 * バックエンド統合設定の検証
 */
function validateBackendIntegration() {
  console.log('\n=== バックエンド統合設定検証 ===');
  
  const backendPath = path.join(__dirname, '../amplify/backend.ts');
  
  if (!fs.existsSync(backendPath)) {
    console.error('❌ amplify/backend.ts が見つかりません');
    return false;
  }
  
  const content = fs.readFileSync(backendPath, 'utf8');
  
  const checks = [
    {
      name: 'DynamoDB設定のインポート',
      pattern: /import.*configureSensorDataTable.*from.*dynamodb\/resource/,
      required: true
    },
    {
      name: 'Lambda環境変数設定',
      pattern: /DYNAMODB_TABLE_NAME.*CentraSensorData/,
      required: true
    },
    {
      name: 'DynamoDBアクセス権限',
      pattern: /dynamodb:PutItem.*dynamodb:Query/s,
      required: true
    },
    {
      name: 'テーブル設定の適用',
      pattern: /configureSensorDataTable.*sensorDataTable/,
      required: true
    }
  ];
  
  let allPassed = true;
  
  checks.forEach(check => {
    const found = check.pattern.test(content);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    
    if (check.required && !found) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

/**
 * 設計書要件との照合
 */
function validateDesignRequirements() {
  console.log('\n=== 設計書要件照合 ===');
  
  const requirements = [
    {
      id: '7.2',
      description: 'DynamoDBパーティション/ソートキー構造',
      check: () => {
        // data/resource.tsでPK/SK構造を確認
        const dataPath = path.join(__dirname, '../amplify/data/resource.ts');
        const content = fs.readFileSync(dataPath, 'utf8');
        return content.includes('PK: a.string().required()') && 
               content.includes('SK: a.string().required()');
      }
    },
    {
      id: '6.5',
      description: 'TTL設定（RAW: 1時間、STATS: 24時間）',
      check: () => {
        const dynamoPath = path.join(__dirname, '../amplify/backend/dynamodb/resource.ts');
        const content = fs.readFileSync(dynamoPath, 'utf8');
        return content.includes('3600') && content.includes('86400');
      }
    }
  ];
  
  let allPassed = true;
  
  requirements.forEach(req => {
    const passed = req.check();
    const status = passed ? '✅' : '❌';
    console.log(`${status} 要件${req.id}: ${req.description}`);
    
    if (!passed) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

/**
 * メイン実行関数
 */
function main() {
  console.log('CDK設定の検証を開始...\n');
  
  const results = [
    validateDataResource(),
    validateDynamoDBConfig(),
    validateBackendIntegration(),
    validateDesignRequirements()
  ];
  
  const allPassed = results.every(result => result);
  
  console.log('\n=== 検証結果 ===');
  if (allPassed) {
    console.log('✅ すべての検証に合格しました');
    console.log('DynamoDBテーブル設計とCDK実装が完了しています');
  } else {
    console.log('❌ 一部の検証に失敗しました');
    console.log('上記のエラーを修正してください');
  }
  
  return allPassed;
}

// スクリプト実行
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = {
  validateDataResource,
  validateDynamoDBConfig,
  validateBackendIntegration,
  validateDesignRequirements
};