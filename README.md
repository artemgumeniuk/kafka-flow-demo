# Kafka Flow Demo

Interactive visualization of Apache Kafka and Confluent Platform architecture with real-time message streaming.

## Features

- 🎯 **Interactive Architecture Diagram** - Click on components to learn more
- 🔄 **Real-time Message Streaming** - Watch messages flow through the pipeline
- 🌐 **Dual Platform Support** - Toggle between Apache Kafka and Confluent Platform
- 📊 **Partition Analytics** - Track partition activity, skew, and consumer lag
- ⚡ **Performance Simulation** - Configurable thresholds and scaling scenarios
- 🚨 **Error Handling** - Dead letter queue visualization

## Live Demo

🔗 **[View Live Demo]([https://your-vercel-domain.vercel.app](https://kafka-flow-demo.vercel.app/))**

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/kafka-flow-demo.git
cd kafka-flow-demo

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application running.

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production version
- `npm run preview` - Preview production build locally
- `npm run lint` - Run TypeScript type checking
- `npm run type-check` - Type checking without emitting files

## Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/kafka-flow-demo)

**Manual deployment:**

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

**Automatic deployment:**
- Push to your GitHub repository
- Connect to Vercel dashboard
- Automatic deployments on every commit

### Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/kafka-flow-demo)

**Manual deployment:**
1. Build: `npm run build`
2. Upload `dist/` folder to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`

### Other Platforms

The application builds to static files in the `dist/` directory and can be deployed to:
- GitHub Pages
- AWS S3 + CloudFront
- Azure Static Web Apps
- Any static hosting provider

## Architecture

This demo visualizes:

### Apache Kafka Components
- **Producers** - Services publishing events
- **Topics** - Distributed logs with partitions
- **Stream Processors** - Kafka Streams applications
- **Consumer Groups** - Scalable event consumers
- **Connectors** - Integration with external systems

### Confluent Platform Additions
- **Schema Registry** - Schema evolution and validation
- **ksqlDB** - SQL-based stream processing
- **Control Center** - Management and monitoring GUI
- **Tiered Storage** - Cost-effective infinite retention
- **Cluster Linking** - Multi-region replication
- **RBAC** - Role-based access control

## Interactive Features

### Message Flow Simulation
- **Auto-streaming** - Continuous message generation
- **Partition routing** - Hash-based partition assignment
- **Error handling** - Invalid messages route to DLQ
- **Threshold filtering** - High-value orders trigger fraud alerts

### Visual Feedback
- **Partition activity** - Real-time partition utilization
- **Consumer lag** - Backlog visualization per partition
- **Hot partitions** - Identify skewed workloads
- **Connection highlighting** - Hover to see data flows

### Control Panel
- **Create Skew** - Simulate partition imbalance
- **Hot Partition** - Generate high-throughput scenario
- **Scale consumers** - Adjust parallelism
- **Change thresholds** - Modify processing rules

## Technology Stack

- **React 18** - UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **SVG** - Scalable vector graphics for diagrams
- **CSS-in-JS** - Styled components approach

## Configuration

### Vercel Optimization

The project includes `vercel.json` with:
- SPA routing configuration
- Static asset caching
- Security headers
- Build optimization

### Build Output

- **Static assets** optimized for CDN delivery
- **Code splitting** for faster initial load
- **Tree shaking** to eliminate unused code
- **Compression** with gzip/brotli support

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

MIT License - feel free to use for education, demos, or commercial projects.

## Kafka Resources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Platform Documentation](https://docs.confluent.io/)
- [Kafka Streams Guide](https://kafka.apache.org/documentation/streams/)
- [Schema Registry Guide](https://docs.confluent.io/platform/current/schema-registry/)
