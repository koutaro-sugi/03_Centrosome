const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const xml2js = require('xml2js');

async function extractKMZ(kmzPath) {
  const tempDir = path.join(__dirname, 'temp', path.basename(kmzPath, '.kmz'));
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    fs.createReadStream(kmzPath)
      .pipe(unzipper.Extract({ path: tempDir }))
      .on('close', async () => {
        // Find KML file
        const files = fs.readdirSync(tempDir);
        const kmlFile = files.find(f => f.endsWith('.kml'));
        
        if (!kmlFile) {
          reject(new Error('No KML file found in KMZ'));
          return;
        }

        // Read and parse KML
        const kmlContent = fs.readFileSync(path.join(tempDir, kmlFile), 'utf8');
        const parser = new xml2js.Parser();
        
        try {
          const result = await parser.parseStringPromise(kmlContent);
          
          // Clean up temp directory
          fs.rmSync(tempDir, { recursive: true, force: true });
          
          resolve(result);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

async function extractPolygonFromKML(kmlData) {
  try {
    // Navigate through KML structure to find polygon coordinates
    const document = kmlData.kml.Document[0];
    const placemark = document.Placemark[0];
    const polygon = placemark.Polygon[0];
    const outerBoundary = polygon.outerBoundaryIs[0];
    const linearRing = outerBoundary.LinearRing[0];
    const coordinates = linearRing.coordinates[0];
    
    // Parse coordinates string
    const coordArray = coordinates.trim().split(/\s+/)
      .filter(coord => coord.length > 0)
      .map(coord => {
        const [lon, lat, alt] = coord.split(',').map(Number);
        return { lat, lon };
      });
    
    return {
      name: placemark.name[0],
      polygon: coordArray
    };
  } catch (err) {
    console.error('Error parsing KML structure:', err);
    throw err;
  }
}

async function processAllKMZFiles() {
  const kmzFiles = [
    { code: 'URSI', path: '/Users/koutarosugi/Documents/URSI.kmz' },
    { code: 'UFKE', path: '/Users/koutarosugi/Documents/UFKE.kmz' },
    { code: 'UWAK', path: '/Users/koutarosugi/Documents/UWAK.kmz' },
    { code: 'UNAG', path: '/Users/koutarosugi/Documents/UNAG.kmz' }
  ];

  const results = [];

  for (const file of kmzFiles) {
    try {
      console.log(`Processing ${file.code}...`);
      const kmlData = await extractKMZ(file.path);
      const polygonData = await extractPolygonFromKML(kmlData);
      
      results.push({
        code: file.code,
        name: polygonData.name,
        polygon: polygonData.polygon
      });
      
      console.log(`✓ ${file.code}: ${polygonData.polygon.length} points`);
    } catch (err) {
      console.error(`Error processing ${file.code}:`, err);
    }
  }

  // Save results to JSON
  const outputPath = path.join(__dirname, 'uasPortPolygons.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved polygon data to ${outputPath}`);

  return results;
}

// Run if called directly
if (require.main === module) {
  processAllKMZFiles().catch(console.error);
}

module.exports = { extractKMZ, extractPolygonFromKML, processAllKMZFiles };