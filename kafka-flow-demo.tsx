import React, { useState, useEffect, useRef, useCallback } from 'react';

// Types
export type NodeType =
  | "producer" | "cluster" | "topic" | "schema-registry"
  | "stream-proc" | "consumer-group" | "connector-sink"
  | "observability" | "security" | "ksqldb" | "control-center"
  | "cluster-linking" | "tiered-storage" | "connector-source";

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  partitions?: number;
  replication?: number;
  compacted?: boolean;
  members?: number;
  confluentOnly?: boolean;
}

export type Edge = [string, string, boolean?]; // [from, to, confluentOnly?]

interface Message {
  id: string;
  data: OrderRecord;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  path: string[];
  currentEdgeIndex: number;
  color: string;
  isDLQ?: boolean;
  partition?: number;
}

interface OrderRecord {
  order_id: string;
  user_id: number;
  amount: number;
  country: "SE" | "NO" | "DK" | "FI" | "DE";
  ts: string;
}

interface PopupInfo {
  node: Node;
  x: number;
  y: number;
}

// Color palettes
const COLORS = {
  bg: '#0a0e27',
  bgLight: '#151932',
  grid: '#1a1f3a',
  primary: '#00d4ff',
  secondary: '#7c3aed',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#e2e8f0',
  textDim: '#64748b',
  border: '#334155',
  confluent: '#ff6b35',
  confluentLight: '#ff8659',
  kafka: '#231f20',
  node: {
    producer: '#10b981',
    topic: '#00d4ff',
    cluster: '#7c3aed',
    'schema-registry': '#ff6b35',
    'stream-proc': '#ec4899',
    'consumer-group': '#8b5cf6',
    'connector-sink': '#06b6d4',
    'connector-source': '#06b6d4',
    observability: '#f43f5e',
    security: '#6366f1',
    ksqldb: '#ff6b35',
    'control-center': '#ff6b35',
    'cluster-linking': '#ff6b35',
    'tiered-storage': '#ff6b35'
  }
};

// Layout with Confluent-specific nodes
const INITIAL_MODEL: { nodes: Node[]; edges: Edge[] } = {
  nodes: [
    // PRODUCERS column (50-250)
    { id: "prod_checkout", type: "producer", label: "Checkout Service", x: 150, y: 200, width: 140, height: 50 },
    { id: "source_database", type: "connector-source", label: "MySQL CDC", x: 150, y: 300, width: 140, height: 50, confluentOnly: true },
    { id: "prod_inventory", type: "producer", label: "Inventory Service", x: 150, y: 400, width: 140, height: 50 },

    // INGESTION column (270-500)
    { id: "schema", type: "schema-registry", label: "Schema Registry", x: 385, y: 180, width: 140, height: 50, confluentOnly: true },
    { id: "topic_orders", type: "topic", label: "orders", partitions: 3, replication: 3, x: 385, y: 240, width: 120, height: 50 },
    { id: "topic_cdc", type: "topic", label: "mysql.cdc.events", x: 385, y: 320, width: 120, height: 50, confluentOnly: true },
    { id: "topic_inventory", type: "topic", label: "inventory", partitions: 2, replication: 3, x: 385, y: 400, width: 120, height: 50 },

    // STREAMS column (520-720)
    { id: "processor", type: "stream-proc", label: "Kafka Streams", x: 620, y: 420, width: 140, height: 60 },
    { id: "ksqldb", type: "ksqldb", label: "ksqlDB", x: 620, y: 300, width: 140, height: 60, confluentOnly: true },
    { id: "dlq", type: "topic", label: "dead-letter-queue", x: 620, y: 200, width: 140, height: 50 },

    // OUTPUT column (740-920)
    { id: "topic_alerts", type: "topic", label: "fraud-alerts", x: 830, y: 200, width: 120, height: 50 },
    { id: "topic_enriched", type: "topic", label: "enriched-orders", x: 830, y: 300, width: 120, height: 50 },
    { id: "topic_aggregated", type: "topic", label: "order-aggregates", x: 830, y: 400, width: 120, height: 50, confluentOnly: true },

    // CONSUMERS column (940-1120)
    { id: "group_fraud", type: "consumer-group", label: "Fraud Team", members: 2, x: 1030, y: 200, width: 140, height: 50 },
    { id: "group_analytics", type: "consumer-group", label: "Analytics", members: 3, x: 1030, y: 300, width: 140, height: 50 },
    { id: "group_reporting", type: "consumer-group", label: "Reporting", members: 2, x: 1030, y: 400, width: 140, height: 50, confluentOnly: true },

    // SINKS column (1140-1300)
    { id: "sink_slack", type: "connector-sink", label: "Slack Sink", x: 1220, y: 200, width: 120, height: 50 },
    { id: "sink_snowflake", type: "connector-sink", label: "Snowflake Sink", x: 1220, y: 300, width: 120, height: 50, confluentOnly: true },
    { id: "sink_elastic", type: "connector-sink", label: "Elasticsearch", x: 1220, y: 400, width: 120, height: 50, confluentOnly: true },

    // Infrastructure layer (bottom row)
    { id: "security", type: "security", label: "RBAC/ACLs", x: 200, y: 580, width: 130, height: 60 },
    { id: "cluster", type: "cluster", label: "Kafka Cluster", x: 595, y: 490, width: 660, height: 45 },
    { id: "control_center", type: "control-center", label: "Control Center", x: 370, y: 580, width: 130, height: 60, confluentOnly: true },
    { id: "tiered_storage", type: "tiered-storage", label: "Tiered Storage", x: 540, y: 580, width: 130, height: 60, confluentOnly: true },
    { id: "cluster_linking", type: "cluster-linking", label: "Cluster Linking", x: 710, y: 580, width: 130, height: 60, confluentOnly: true },
    { id: "obs", type: "observability", label: "Monitoring", x: 880, y: 580, width: 130, height: 60 }
  ],
  edges: [
    // Source connections
    ["source_database", "topic_cdc", true],
    ["prod_checkout", "topic_orders"],
    ["prod_inventory", "topic_inventory"],
    
    // Schema Registry connections (Confluent)
    ["schema", "prod_checkout", true],
    ["schema", "prod_inventory", true],
    ["schema", "processor", true],
    ["schema", "ksqldb", true],
    ["schema", "source_database", true],
    
    // Processing flows
    ["topic_orders", "processor"],
    ["topic_inventory", "processor"],
    ["topic_cdc", "ksqldb", true],
    ["topic_orders", "ksqldb", true],
    ["processor", "topic_alerts"],
    ["processor", "topic_enriched"],
    ["ksqldb", "topic_aggregated", true],
    ["processor", "dlq"],
    ["ksqldb", "dlq", true],
    
    // Consumer flows
    ["topic_alerts", "group_fraud"],
    ["topic_enriched", "group_analytics"],
    ["topic_aggregated", "group_reporting", true],
    ["group_fraud", "sink_slack"],
    ["group_analytics", "sink_snowflake", true],
    ["group_reporting", "sink_elastic", true],
    
    // Error handling
    ["group_fraud", "dlq"],
    ["group_analytics", "dlq"],
    
    // Infrastructure
    ["cluster", "topic_orders"],
    ["cluster", "topic_inventory"],
    ["cluster", "topic_cdc", true],
    ["control_center", "cluster", true],
    ["tiered_storage", "cluster", true],
    ["cluster_linking", "cluster", true],
    ["obs", "cluster"],
    ["security", "cluster"]
  ]
};

// Helper functions
const hashUserIdToPartition = (userId: number, partitions: number): number => {
  return Math.abs(userId) % partitions;
};

const generateOrderId = (): string => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
};

const generateOrder = (skewCountry?: string): OrderRecord => {
  const countries: OrderRecord['country'][] = ["SE", "NO", "DK", "FI", "DE"];
  return {
    order_id: generateOrderId(),
    user_id: Math.floor(Math.random() * 10000),
    amount: Math.floor(Math.random() * 2000) + 100,
    country: skewCountry ? skewCountry as OrderRecord['country'] : countries[Math.floor(Math.random() * countries.length)],
    ts: new Date().toISOString()
  };
};

// Content definitions with Confluent features
const NODE_CONTENT: Record<string, { what: string; demo: string; configs: string[]; action: string; confluentFeature?: string }> = {
  source_database: {
    what: "Kafka Connect source connector with CDC.",
    demo: "Captures MySQL changes in real-time using Debezium.",
    configs: ["connector.class=DebeziumMySqlConnector", "database.history.kafka.topic=dbhistory", "snapshot.mode=initial"],
    action: "Trigger Snapshot",
    confluentFeature: "Confluent Hub connector with Schema Registry integration"
  },
  prod_checkout: {
    what: "Service publishing order events to Kafka.",
    demo: "Sends Avro-encoded orders with schema evolution support.",
    configs: ["acks=all", "retries=5", "enable.idempotence=true", "compression.type=snappy"],
    action: "Send Burst (10 orders)"
  },
  topic_orders: {
    what: "Distributed log storing order events.",
    demo: "Infinite retention with Tiered Storage to S3.",
    configs: ["partitions=3", "replication.factor=3", "confluent.tier.enable=true", "retention.ms=-1"],
    action: "Scale to 6 Partitions",
    confluentFeature: "Infinite retention with Tiered Storage"
  },
  schema: {
    what: "Confluent Schema Registry for schema management.",
    demo: "Centralized Avro/Protobuf/JSON schema evolution.",
    configs: ["compatibility=BACKWARD_TRANSITIVE", "mode=READWRITE", "schema.cache.size=1000"],
    action: "View Schema Evolution",
    confluentFeature: "Schema validation, evolution, and compatibility checks"
  },
  processor: {
    what: "Kafka Streams stateful processing.",
    demo: "Exactly-once processing with state stores.",
    configs: ["processing.guarantee=exactly_once_v2", "num.stream.threads=4", "state.dir=/var/kafka-streams"],
    action: "Change Threshold → 500"
  },
  ksqldb: {
    what: "Confluent ksqlDB for stream processing with SQL.",
    demo: "Real-time aggregations and joins using SQL syntax.",
    configs: ["ksql.streams.num.stream.threads=4", "ksql.schema.registry.url=http://sr:8081", "processing.guarantee=exactly_once_v2"],
    action: "Show Running Queries",
    confluentFeature: "SQL-based stream processing with materialized views"
  },
  control_center: {
    what: "Confluent Control Center for cluster management.",
    demo: "GUI for monitoring, alerting, and data lineage.",
    configs: ["confluent.controlcenter.data.dir=/var/c3", "confluent.monitoring.interceptor.topic=_metrics"],
    action: "Open Dashboard",
    confluentFeature: "Enterprise GUI for operations and monitoring"
  },
  tiered_storage: {
    what: "Confluent Tiered Storage for infinite retention.",
    demo: "Automatic archival to S3/GCS/Azure Blob.",
    configs: ["confluent.tier.enable=true", "confluent.tier.backend=S3", "confluent.tier.s3.bucket=kafka-archive"],
    action: "View Storage Metrics",
    confluentFeature: "Cost-effective infinite retention with cloud storage"
  },
  cluster_linking: {
    what: "Confluent Cluster Linking for geo-replication.",
    demo: "Byte-for-byte replication across regions/clouds.",
    configs: ["link.mode=BIDIRECTIONAL", "consumer.offset.sync.enable=true", "acl.sync.enable=true"],
    action: "Show Link Status",
    confluentFeature: "Native geo-replication without Mirror Maker"
  },
  group_fraud: {
    what: "Consumer group for fraud detection alerts.",
    demo: "Auto-scaling with Confluent Cloud.",
    configs: ["group.id=fraud-detection", "enable.auto.commit=false", "max.poll.records=100"],
    action: "Scale to 3 Members"
  },
  sink_snowflake: {
    what: "Confluent Snowflake Sink Connector.",
    demo: "Automatic schema evolution and exactly-once delivery.",
    configs: ["connector.class=SnowflakeSinkConnector", "snowflake.database=ANALYTICS", "behavior.on.error=dlq"],
    action: "Show Delivery Stats",
    confluentFeature: "Fully-managed connector with automatic schema evolution"
  },
  sink_elastic: {
    what: "Confluent Elasticsearch Sink Connector.",
    demo: "Real-time search indexing with type inference.",
    configs: ["connector.class=ElasticsearchSinkConnector", "connection.url=http://elastic:9200", "type.name=_doc"],
    action: "View Index Stats",
    confluentFeature: "Enterprise connector with enhanced monitoring"
  },
  dlq: {
    what: "Dead letter queue for failed messages.",
    demo: "Automatic routing with Control Center alerts.",
    configs: ["retention.ms=2592000000", "confluent.key.schema.validation=true", "confluent.value.schema.validation=true"],
    action: "Inspect & Replay",
    confluentFeature: "Schema validation with automatic DLQ routing"
  },
  cluster: {
    what: "Kafka broker cluster.",
    demo: "Multi-zone deployment with automatic balancing.",
    configs: ["num.brokers=3", "min.insync.replicas=2", "confluent.balancer.enable=true"],
    action: "Show Metrics",
    confluentFeature: "Self-Balancing Clusters with Auto Data Balancer"
  },
  security: {
    what: "Role-Based Access Control (RBAC).",
    demo: "Confluent RBAC with LDAP integration.",
    configs: ["security.protocol=SASL_SSL", "sasl.mechanism=OAUTHBEARER", "confluent.authorizer.access.rule.providers=CONFLUENT"],
    action: "View Permissions",
    confluentFeature: "Enterprise RBAC with centralized authorization"
  },
  topic_inventory: {
    what: "Distributed log storing inventory events.",
    demo: "Real-time inventory updates with low latency.",
    configs: ["partitions=2", "replication.factor=3", "min.insync.replicas=2", "cleanup.policy=compact"],
    action: "Enable Compaction"
  },
  topic_enriched: {
    what: "Topic containing enriched order events.",
    demo: "Orders joined with customer and inventory data.",
    configs: ["partitions=3", "replication.factor=3", "retention.ms=604800000", "compression.type=lz4"],
    action: "View Schema"
  },
  topic_alerts: {
    what: "Topic for fraud detection alerts.",
    demo: "High-priority alerts for suspicious transactions.",
    configs: ["partitions=3", "replication.factor=3", "retention.ms=86400000", "min.insync.replicas=2"],
    action: "Show Alert Rules"
  },
  group_analytics: {
    what: "Consumer group for analytics processing.",
    demo: "Batch processing for business intelligence.",
    configs: ["group.id=analytics-team", "enable.auto.commit=true", "session.timeout.ms=30000", "auto.offset.reset=earliest"],
    action: "Scale to 5 Members"
  },
  group_reporting: {
    what: "Consumer group for reporting pipeline.",
    demo: "Daily/weekly report generation with ksqlDB.",
    configs: ["group.id=reporting-service", "enable.auto.commit=false", "isolation.level=read_committed", "max.poll.interval.ms=300000"],
    action: "View Reports",
    confluentFeature: "Exactly-once processing for financial reporting"
  },
  prod_inventory: {
    what: "Inventory service publishing stock updates.",
    demo: "Real-time inventory changes from warehouse systems.",
    configs: ["acks=all", "retries=3", "batch.size=16384", "linger.ms=5"],
    action: "Send Stock Update"
  },
  sink_slack: {
    what: "Slack notification connector.",
    demo: "Real-time alerts sent to Slack channels.",
    configs: ["connector.class=SlackSinkConnector", "slack.webhook.url=${SLACK_WEBHOOK}", "message.template=Alert: {alert_type}"],
    action: "Test Notification"
  },
  obs: {
    what: "Monitoring and observability platform.",
    demo: "Metrics, logs, and traces for the entire pipeline.",
    configs: ["metrics.reporters=JmxReporter,PrometheusReporter", "log.retention.hours=168", "jmx.port=9999"],
    action: "Open Dashboard"
  },
  topic_cdc: {
    what: "Change Data Capture events from MySQL.",
    demo: "Real-time database changes captured via Debezium.",
    configs: ["partitions=1", "replication.factor=3", "cleanup.policy=delete", "retention.ms=604800000"],
    action: "View Schema Evolution",
    confluentFeature: "Schema Registry integration with automatic evolution"
  },
  topic_aggregated: {
    what: "Aggregated metrics and KPIs.",
    demo: "Real-time aggregations computed by ksqlDB.",
    configs: ["partitions=2", "replication.factor=3", "cleanup.policy=compact", "confluent.tier.enable=true"],
    action: "Show Aggregations",
    confluentFeature: "Materialized views with Tiered Storage"
  }
};

// Main component
const KafkaFlowDemo: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_MODEL.nodes);
  const [edges] = useState<Edge[]>(INITIAL_MODEL.edges);
  const [messages, setMessages] = useState<Message[]>([]);
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [isStreaming, setIsStreaming] = useState(true);
  const [isConfluentMode, setIsConfluentMode] = useState(false);
  const [skewCountry, setSkewCountry] = useState<string | null>(null);
  const [processorThreshold, setProcessorThreshold] = useState(1000);
  const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [stats, setStats] = useState({ processed: 0, alerts: 0, enriched: 0, dlq: 0 });
  const [partitionLag, setPartitionLag] = useState<Record<string, number[]>>({
    group_fraud: [0, 0, 0],
    group_analytics: [0, 0, 0],
    group_reporting: [0, 0]
  });
  const [partitionActivity, setPartitionActivity] = useState<Record<string, number[]>>({
    topic_orders: [0, 0, 0],
    topic_inventory: [0, 0],
    topic_enriched: [0, 0, 0],
    topic_alerts: [0, 0, 0]
  });
  
  const animationRef = useRef<number>();
  const streamIntervalRef = useRef<number>();

  // Filter nodes and edges based on mode
  const visibleNodes = nodes.filter(n => !n.confluentOnly || isConfluentMode);
  const visibleEdges = edges.filter(e => !e[2] || isConfluentMode);

  // Find node by ID
  const findNode = (id: string): Node | undefined => nodes.find(n => n.id === id);

  // Create a new message
  const createMessage = useCallback((isBad = false, source = "prod_checkout") => {
    const order = isBad ? { ...generateOrder(), amount: NaN } : generateOrder(skewCountry || undefined);
    const startNode = findNode(source);
    if (!startNode) return;

    const partition = hashUserIdToPartition(order.user_id, 3);
    
    let path: string[];
    if (source === "source_database" && isConfluentMode) {
      path = ["source_database", "topic_cdc", "ksqldb", "topic_aggregated", "group_reporting", "sink_elastic"];
    } else if (source === "prod_inventory") {
      path = ["prod_inventory", "topic_inventory", "processor", "topic_enriched", "group_analytics", 
              isConfluentMode ? "sink_snowflake" : "dlq"];
    } else {
      if (isBad) {
        path = ["prod_checkout", "topic_orders", "processor", "dlq"];
      } else if (order.amount >= processorThreshold) {
        path = ["prod_checkout", "topic_orders", "processor", "topic_alerts", "group_fraud", "sink_slack"];
      } else if (isConfluentMode && Math.random() < 0.3) {
        path = ["prod_checkout", "topic_orders", "ksqldb", "topic_aggregated", "group_reporting", "sink_elastic"];
      } else {
        path = ["prod_checkout", "topic_orders", "processor", "topic_enriched", "group_analytics", 
                isConfluentMode ? "sink_snowflake" : "dlq"];
      }
    }

    const message: Message = {
      id: order.order_id,
      data: order,
      x: startNode.x || 0,
      y: startNode.y || 0,
      targetX: startNode.x || 0,
      targetY: startNode.y || 0,
      path: path.filter(nodeId => !findNode(nodeId)?.confluentOnly || isConfluentMode),
      currentEdgeIndex: 0,
      color: isBad ? COLORS.danger : (order.amount >= processorThreshold ? COLORS.warning : COLORS.success),
      isDLQ: isBad,
      partition
    };

    setMessages(prev => [...prev, message]);

    // Track partition activity for topics
    const topicId = path[1]; // Second item in path is usually the topic
    if (topicId && topicId.startsWith('topic_')) {
      setPartitionActivity(prev => ({
        ...prev,
        [topicId]: prev[topicId]?.map((activity, i) =>
          i === partition ? Math.min(activity + 10, 100) : Math.max(activity - 1, 0)
        ) || []
      }));
    }

    // Update stats
    setStats(prev => ({
      processed: prev.processed + 1,
      alerts: order.amount >= processorThreshold ? prev.alerts + 1 : prev.alerts,
      enriched: order.amount < processorThreshold && !isBad ? prev.enriched + 1 : prev.enriched,
      dlq: isBad ? prev.dlq + 1 : prev.dlq
    }));

    // Simulate lag
    if (!isBad) {
      const targetGroup = order.amount >= processorThreshold ? 'group_fraud' : 
                          path.includes('group_reporting') ? 'group_reporting' : 'group_analytics';
      setPartitionLag(prev => ({
        ...prev,
        [targetGroup]: prev[targetGroup]?.map((lag, i) => 
          i === partition ? Math.min(lag + 1, 100) : lag
        ) || [0, 0, 0]
      }));
    }
  }, [skewCountry, processorThreshold, isConfluentMode]);

  // Animation loop
  const animate = useCallback(() => {
    setMessages(prev => {
      const updated = prev.map(msg => {
        if (msg.currentEdgeIndex >= msg.path.length - 1) {
          // Message reached destination, update lag
          const nodeId = msg.path[msg.path.length - 1];
          if (nodeId.startsWith('group_')) {
            setPartitionLag(prev => ({
              ...prev,
              [nodeId]: prev[nodeId]?.map((lag, i) => 
                i === (msg.partition || 0) ? Math.max(lag - 1, 0) : lag
              ) || [0, 0, 0]
            }));
          }
          return null;
        }

        const targetNodeId = msg.path[msg.currentEdgeIndex + 1];
        const targetNode = findNode(targetNodeId);
        if (!targetNode) return null;

        const dx = (targetNode.x || 0) - msg.x;
        const dy = (targetNode.y || 0) - msg.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
          return {
            ...msg,
            currentEdgeIndex: msg.currentEdgeIndex + 1,
            x: targetNode.x || 0,
            y: targetNode.y || 0
          };
        }

        const speed = 4;
        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;

        return {
          ...msg,
          x: msg.x + vx,
          y: msg.y + vy
        };
      }).filter(Boolean) as Message[];

      return updated;
    });

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Start/stop streaming
  useEffect(() => {
    if (isStreaming) {
      let counter = 0;
      streamIntervalRef.current = setInterval(() => {
        counter++;
        const sources = isConfluentMode 
          ? ["prod_checkout", "prod_inventory", "source_database"]
          : ["prod_checkout", "prod_inventory"];
        const source = sources[counter % sources.length];
        createMessage(Math.random() < 0.02, source);
      }, 600);
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isStreaming, createMessage, animate, isConfluentMode]);

  // Handle node click
  const handleNodeClick = (node: Node, e: React.MouseEvent) => {
    const svg = e.currentTarget.closest('svg');
    const rect = svg?.getBoundingClientRect();
    if (!rect) return;
    
    setPopup({
      node,
      x: (node.x || 0) + (node.width || 120) / 2,
      y: (node.y || 0) + (node.height || 50) + 10
    });
  };

  // Handle action button
  const handleAction = (nodeId: string) => {
    switch (nodeId) {
      case "topic_orders":
        setNodes(prev => prev.map(n => 
          n.id === nodeId ? { ...n, partitions: 6 } : n
        ));
        break;
      case "group_fraud":
        setNodes(prev => prev.map(n => 
          n.id === nodeId ? { ...n, members: 3 } : n
        ));
        break;
      case "group_analytics":
        setNodes(prev => prev.map(n => 
          n.id === nodeId && n.members && n.members > 1 ? { ...n, members: n.members - 1 } : n
        ));
        break;
      case "processor":
        setProcessorThreshold(prev => prev === 1000 ? 500 : 1000);
        break;
      case "prod_checkout":
        for (let i = 0; i < 10; i++) {
          setTimeout(() => createMessage(false, "prod_checkout"), i * 100);
        }
        break;
      case "source_database":
        if (isConfluentMode) {
          for (let i = 0; i < 5; i++) {
            setTimeout(() => createMessage(false, "source_database"), i * 150);
          }
        }
        break;
    }
    setPopup(null);
  };

  // Render node
  const renderNode = (node: Node) => {
    if (node.confluentOnly && !isConfluentMode) return null;
    
    const nodeColor = node.confluentOnly ? COLORS.confluent : (COLORS.node[node.type] || COLORS.primary);
    const isActive = messages.some(m => m.path[m.currentEdgeIndex] === node.id);
    const isHovered = hoveredNode === node.id;
    
    return (
      <g key={node.id}>
        {/* Confluent badge */}
        {node.confluentOnly && (
          <rect
            x={node.x! - (node.width || 120) / 2 - 2}
            y={node.y! - (node.height || 50) / 2 - 2}
            width={(node.width || 120) + 4}
            height={(node.height || 50) + 4}
            rx={5}
            fill="none"
            stroke={COLORS.confluent}
            strokeWidth={2}
            strokeDasharray="3,3"
            opacity={0.5}
          />
        )}
        
        {/* Main node */}
        <rect
          x={node.x! - (node.width || 120) / 2}
          y={node.y! - (node.height || 50) / 2}
          width={node.width || 120}
          height={node.height || 50}
          rx={4}
          fill={isHovered ? COLORS.bgLight : COLORS.bg}
          stroke={nodeColor}
          strokeWidth={isActive || isHovered ? 2 : 1}
          style={{
            filter: isActive ? `drop-shadow(0 0 8px ${nodeColor}80)` : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={(e) => handleNodeClick(node, e)}
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
        />
        
        {/* Type indicator */}
        <rect
          x={node.x! - (node.width || 120) / 2}
          y={node.y! - (node.height || 50) / 2}
          width={4}
          height={node.height || 50}
          fill={nodeColor}
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Confluent logo for Confluent-specific features */}
        {node.confluentOnly && (
          <text
            x={node.x! + (node.width || 120) / 2 - 15}
            y={node.y! - (node.height || 50) / 2 + 15}
            fill={COLORS.confluent}
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            C
          </text>
        )}
        
        {/* Label */}
        <text
          x={node.x}
          y={node.y! - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COLORS.text}
          fontSize="13"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="500"
          style={{ pointerEvents: 'none' }}
        >
          {node.label}
        </text>


        {/* Partitions for topics */}
        {node.partitions && (
          <g style={{ pointerEvents: 'none' }}>
            {Array.from({ length: node.partitions }).map((_, i) => {
              const activity = partitionActivity[node.id]?.[i] || 0;
              const isHot = activity > 50;
              const isSkewed = skewCountry && node.id === 'topic_orders' && activity > 30;

              return (
                <g key={i}>
                  {/* Partition background */}
                  <rect
                    x={node.x! - (node.width || 120) / 2 + 10 + i * 18}
                    y={node.y! + 8}
                    width={15}
                    height={8}
                    fill={isSkewed ? COLORS.warning : isHot ? COLORS.danger : nodeColor}
                    fillOpacity={isSkewed ? 0.8 : isHot ? 0.6 : 0.3}
                    stroke={isSkewed ? COLORS.warning : isHot ? COLORS.danger : nodeColor}
                    strokeWidth={isSkewed ? 2 : isHot ? 1.5 : 0.5}
                    style={{
                      filter: isSkewed ? `drop-shadow(0 0 4px ${COLORS.warning})` :
                              isHot ? `drop-shadow(0 0 3px ${COLORS.danger})` : 'none'
                    }}
                  />
                  {/* Activity indicator */}
                  <rect
                    x={node.x! - (node.width || 120) / 2 + 11 + i * 18}
                    y={node.y! + 9}
                    width={13 * (activity / 100)}
                    height={6}
                    fill={isSkewed ? 'white' : isHot ? 'white' : nodeColor}
                    fillOpacity={0.8}
                  />
                  {/* Hot partition warning */}
                  {isSkewed && (
                    <text
                      x={node.x! - (node.width || 120) / 2 + 17 + i * 18}
                      y={node.y! + 6}
                      textAnchor="middle"
                      fill={COLORS.warning}
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      🔥
                    </text>
                  )}
                </g>
              );
            })}
            <text
              x={node.x}
              y={node.y! + 12}
              textAnchor="middle"
              fill={COLORS.textDim}
              fontSize="10"
              fontFamily="monospace"
            >
              P:{node.partitions} RF:{node.replication}
            </text>
            {/* Skew warning */}
            {skewCountry && node.id === 'topic_orders' && (
              <text
                x={node.x}
                y={node.y! + 25}
                textAnchor="middle"
                fill={COLORS.warning}
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ⚠️ PARTITION SKEW
              </text>
            )}
          </g>
        )}
        
        {/* Members for consumer groups */}
        {node.members && (
          <text
            x={node.x}
            y={node.y! + 10}
            textAnchor="middle"
            fill={COLORS.textDim}
            fontSize="11"
            fontFamily="monospace"
            style={{ pointerEvents: 'none' }}
          >
            {node.members} members
          </text>
        )}

        {/* Lag visualization */}
        {node.id.startsWith('group_') && partitionLag[node.id] && (
          <g style={{ pointerEvents: 'none' }}>
            {partitionLag[node.id].map((_, i) => (
              <rect
                key={i}
                x={node.x! - 30 + i * 20}
                y={node.y! + (node.height || 50) / 2 + 5}
                width={18}
                height={4}
                fill={COLORS.border}
              />
            ))}
            {partitionLag[node.id].map((lag, i) => (
              <rect
                key={`lag-${i}`}
                x={node.x! - 30 + i * 20}
                y={node.y! + (node.height || 50) / 2 + 5}
                width={Math.min(18 * (lag / 100), 18)}
                height={4}
                fill={lag > 50 ? COLORS.danger : lag > 20 ? COLORS.warning : COLORS.success}
              />
            ))}
          </g>
        )}
      </g>
    );
  };

  // Render edge
  const renderEdge = (edge: Edge) => {
    if (edge[2] && !isConfluentMode) return null;
    
    const [fromId, toId, isConfluentEdge] = edge;
    const fromNode = findNode(fromId);
    const toNode = findNode(toId);
    if (!fromNode || !toNode) return null;
    if ((fromNode.confluentOnly || toNode.confluentOnly) && !isConfluentMode) return null;

    const isHovered = hoveredEdge?.[0] === fromId && hoveredEdge?.[1] === toId;
    const hasTraffic = messages.some(m => 
      m.path[m.currentEdgeIndex] === fromId && 
      m.path[m.currentEdgeIndex + 1] === toId
    );
    
    const edgeColor = isConfluentEdge ? COLORS.confluentLight : COLORS.textDim;
    
    return (
      <g key={`${fromId}-${toId}`}>
        <defs>
          <marker
            id={`arrow-${fromId}-${toId}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill={isHovered ? COLORS.primary : edgeColor}
            />
          </marker>
        </defs>
        <line
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke={isHovered ? COLORS.primary : hasTraffic ? edgeColor : COLORS.textDim}
          strokeWidth={isHovered ? 3 : hasTraffic ? 2 : 1.5}
          strokeDasharray={hasTraffic ? "none" : isConfluentEdge ? "8,4" : "5,5"}
          markerEnd={`url(#arrow-${fromId}-${toId})`}
          opacity={isHovered ? 1 : 0.5}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={() => setHoveredEdge(edge)}
          onMouseLeave={() => setHoveredEdge(null)}
        />
        {isHovered && (
          <g>
            <rect
              x={(fromNode.x! + toNode.x!) / 2 - 70}
              y={(fromNode.y! + toNode.y!) / 2 - 20}
              width={140}
              height={20}
              fill={COLORS.bg}
              fillOpacity={0.95}
              rx={2}
            />
            <text
              x={(fromNode.x! + toNode.x!) / 2}
              y={(fromNode.y! + toNode.y!) / 2 - 8}
              textAnchor="middle"
              fill={COLORS.primary}
              fontSize="10"
              fontFamily="monospace"
            >
              {fromId === 'schema' ? 'Schema validation' : 'Avro • exactly-once'}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: COLORS.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(${COLORS.grid} 1px, transparent 1px),
          linear-gradient(90deg, ${COLORS.grid} 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        opacity: 0.1
      }} />

      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.bgLight,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: '16px 24px',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: 20, 
            fontWeight: 600, 
            color: COLORS.text,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: 24 }}>📊</span>
            {isConfluentMode ? 'Confluent Platform' : 'Apache Kafka'} Architecture
          </h1>

          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '4px',
            backgroundColor: COLORS.bg,
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`
          }}>
            <button
              onClick={() => setIsConfluentMode(false)}
              style={{
                padding: '6px 16px',
                backgroundColor: !isConfluentMode ? COLORS.primary : 'transparent',
                color: !isConfluentMode ? COLORS.bg : COLORS.textDim,
                border: 'none',
                borderRadius: 6,
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 0.2s ease'
              }}
            >
              Open Source Kafka
            </button>
            <button
              onClick={() => setIsConfluentMode(true)}
              style={{
                padding: '6px 16px',
                backgroundColor: isConfluentMode ? COLORS.confluent : 'transparent',
                color: isConfluentMode ? 'white' : COLORS.textDim,
                border: 'none',
                borderRadius: 6,
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 0.2s ease'
              }}
            >
              Confluent Platform
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              style={{
                padding: '8px 20px',
                backgroundColor: isStreaming ? COLORS.danger : COLORS.success,
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease'
              }}
            >
              {isStreaming ? '⏸ Pause' : '▶ Start'} Stream
            </button>
            
            <button
              onClick={() => setSkewCountry(skewCountry ? null : 'SE')}
              style={{
                padding: '8px 16px',
                backgroundColor: skewCountry ? COLORS.warning : COLORS.border,
                color: skewCountry ? COLORS.bg : COLORS.text,
                border: 'none',
                borderRadius: 6,
                fontFamily: 'inherit',
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 0.2s ease'
              }}
            >
              {skewCountry ? '🔥 Hot Partition' : '📊 Create Skew'}
            </button>

            <button
              onClick={() => createMessage(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: COLORS.danger,
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontFamily: 'inherit',
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 0.2s ease'
              }}
            >
              💀 Bad Message
            </button>

            <button
              onClick={() => {
                setMessages([]);
                setStats({ processed: 0, alerts: 0, enriched: 0, dlq: 0 });
                setPartitionLag({
                  group_fraud: [0, 0, 0],
                  group_analytics: [0, 0, 0],
                  group_reporting: [0, 0]
                });
                setPartitionActivity({
                  topic_orders: [0, 0, 0],
                  topic_inventory: [0, 0],
                  topic_enriched: [0, 0, 0],
                  topic_alerts: [0, 0, 0]
                });
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: COLORS.border,
                color: COLORS.text,
                border: 'none',
                borderRadius: 6,
                fontFamily: 'inherit',
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 0.2s ease'
              }}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ 
          display: 'flex', 
          gap: 24, 
          marginTop: 12,
          fontSize: 12,
          color: COLORS.textDim
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS.primary }} />
            <span>Processed: <strong style={{ color: COLORS.text }}>{stats.processed}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS.warning }} />
            <span>Fraud Alerts: <strong style={{ color: COLORS.text }}>{stats.alerts}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS.success }} />
            <span>Enriched: <strong style={{ color: COLORS.text }}>{stats.enriched}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS.danger }} />
            <span>DLQ: <strong style={{ color: COLORS.text }}>{stats.dlq}</strong></span>
          </div>
          {isConfluentMode && (
            <>
              <div style={{ borderLeft: `1px solid ${COLORS.border}`, height: 16, margin: '0 8px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS.confluent }} />
                <span>Confluent Features Active</span>
              </div>
            </>
          )}
          <div style={{ marginLeft: 'auto', color: COLORS.secondary }}>
            Threshold: ${processorThreshold}
          </div>
        </div>
      </div>

      {/* Main SVG */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1350 700"
        style={{ position: 'relative', zIndex: 10, marginTop: 80 }}
      >
        {/* Background sections with enhanced headers */}
        <rect x={50} y={120} width={200} height={330} fill={COLORS.bgLight} fillOpacity={0.3} rx={8} stroke={COLORS.border} strokeWidth={1} />
        <rect x={50} y={120} width={200} height={25} fill={COLORS.primary} fillOpacity={0.1} rx={8} />
        <text x={150} y={137} fill={COLORS.text} fontSize="13" fontFamily="system-ui" fontWeight="600" textAnchor="middle">
          {isConfluentMode ? 'SOURCES' : 'PRODUCERS'}
        </text>

        <rect x={270} y={120} width={230} height={330} fill={COLORS.bgLight} fillOpacity={0.3} rx={8} stroke={COLORS.border} strokeWidth={1} />
        <rect x={270} y={120} width={230} height={25} fill={COLORS.secondary} fillOpacity={0.1} rx={8} />
        <text x={385} y={137} fill={COLORS.text} fontSize="13" fontFamily="system-ui" fontWeight="600" textAnchor="middle">INGESTION</text>

        <rect x={520} y={120} width={200} height={240} fill={COLORS.bgLight} fillOpacity={0.3} rx={8} stroke={COLORS.border} strokeWidth={1} />
        <rect x={520} y={120} width={200} height={25} fill={COLORS.warning} fillOpacity={0.1} rx={8} />
        <text x={620} y={137} fill={COLORS.text} fontSize="13" fontFamily="system-ui" fontWeight="600" textAnchor="middle">
          {isConfluentMode ? 'PROCESSING' : 'STREAMS'}
        </text>

        <rect x={740} y={120} width={180} height={330} fill={COLORS.bgLight} fillOpacity={0.3} rx={8} stroke={COLORS.border} strokeWidth={1} />
        <rect x={740} y={120} width={180} height={25} fill={COLORS.success} fillOpacity={0.1} rx={8} />
        <text x={830} y={137} fill={COLORS.text} fontSize="13" fontFamily="system-ui" fontWeight="600" textAnchor="middle">OUTPUT</text>

        <rect x={940} y={120} width={180} height={330} fill={COLORS.bgLight} fillOpacity={0.3} rx={8} stroke={COLORS.border} strokeWidth={1} />
        <rect x={940} y={120} width={180} height={25} fill={COLORS.node['consumer-group']} fillOpacity={0.1} rx={8} />
        <text x={1030} y={137} fill={COLORS.text} fontSize="13" fontFamily="system-ui" fontWeight="600" textAnchor="middle">CONSUMERS</text>

        <rect x={1140} y={120} width={160} height={330} fill={COLORS.bgLight} fillOpacity={0.3} rx={8} stroke={COLORS.border} strokeWidth={1} />
        <rect x={1140} y={120} width={160} height={25} fill={COLORS.node['connector-sink']} fillOpacity={0.1} rx={8} />
        <text x={1220} y={137} fill={COLORS.text} fontSize="13" fontFamily="system-ui" fontWeight="600" textAnchor="middle">SINKS</text>

        {/* Confluent Platform banner */}
        {isConfluentMode && (
          <g>
            <rect x={50} y={50} width={1250} height={80} fill={COLORS.confluent} fillOpacity={0.05} rx={8} />
            <text x={60} y={70} fill={COLORS.confluent} fontSize="12" fontFamily="monospace" fontWeight="bold">
              CONFLUENT PLATFORM FEATURES
            </text>
            <text x={60} y={90} fill={COLORS.textDim} fontSize="10" fontFamily="monospace">
              Schema Registry • ksqlDB • Control Center • Tiered Storage • Cluster Linking • RBAC • Managed Connectors
            </text>
            <text x={60} y={110} fill={COLORS.confluentLight} fontSize="10" fontFamily="monospace">
              Exactly-Once Semantics • Self-Balancing • Multi-Region Clusters • 99.95% SLA
            </text>
          </g>
        )}

{/* Render edges */}
        {visibleEdges.map(renderEdge)}

        {/* Render nodes */}
        {visibleNodes.map(renderNode)}

        {/* Render messages */}
        {messages.map(msg => (
          <circle
            key={msg.id}
            cx={msg.x}
            cy={msg.y}
            r={5}
            fill={msg.color}
            style={{
              filter: `drop-shadow(0 0 8px ${msg.color}80)`
            }}
          >
            <animate
              attributeName="r"
              values="5;6;5"
              dur="0.5s"
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      {/* Popup */}
      {popup && (() => {
        // Calculate optimal popup position
        const popupHeight = 420; // Estimated popup height
        const yOffset = 30; // Distance from component
        const headerOffset = 80; // Account for top header

        // Check if popup would go below viewport when positioned below component
        const wouldOverflow = (popup.y + headerOffset + yOffset + popupHeight) > window.innerHeight;

        // Position above component if it would overflow, otherwise below
        const topPosition = wouldOverflow
          ? Math.max(10, popup.y + headerOffset - popupHeight - yOffset)
          : popup.y + headerOffset + yOffset;

        return (
          <div
            style={{
              position: 'absolute',
              left: Math.min(Math.max(popup.x - 150, 10), window.innerWidth - 310),
              top: topPosition,
              maxHeight: Math.min(400, window.innerHeight - 80), // Always leave space for header
              width: 300,
              backgroundColor: COLORS.bgLight,
              border: `1px solid ${popup.node.confluentOnly ? COLORS.confluent : (COLORS.node[popup.node.type] || COLORS.border)}`,
              borderRadius: 8,
              padding: 16,
              zIndex: 1000,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              overflow: 'auto' // Allow scrolling if content is too tall
            }}
          >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            marginBottom: 12
          }}>
            <div style={{
              width: 4,
              height: 24,
              backgroundColor: popup.node.confluentOnly ? COLORS.confluent : (COLORS.node[popup.node.type] || COLORS.primary),
              borderRadius: 2
            }} />
            <h3 style={{ 
              margin: 0, 
              color: COLORS.text,
              fontSize: 16,
              fontWeight: 600
            }}>
              {popup.node.label}
            </h3>
            {popup.node.confluentOnly && (
              <span style={{
                marginLeft: 'auto',
                padding: '2px 8px',
                backgroundColor: COLORS.confluent,
                color: 'white',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 'bold'
              }}>
                CONFLUENT
              </span>
            )}
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 4 }}>WHAT</div>
            <div style={{ color: COLORS.text, fontSize: 13 }}>
              {NODE_CONTENT[popup.node.id]?.what}
            </div>
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 4 }}>IN THIS DEMO</div>
            <div style={{ color: COLORS.text, fontSize: 13 }}>
              {NODE_CONTENT[popup.node.id]?.demo}
            </div>
          </div>

          {NODE_CONTENT[popup.node.id]?.confluentFeature && (
            <div style={{ 
              marginBottom: 12, 
              padding: 8, 
              backgroundColor: `${COLORS.confluent}20`,
              borderLeft: `3px solid ${COLORS.confluent}`,
              borderRadius: 4
            }}>
              <div style={{ color: COLORS.confluent, fontSize: 11, marginBottom: 4, fontWeight: 'bold' }}>
                CONFLUENT ADVANTAGE
              </div>
              <div style={{ color: COLORS.text, fontSize: 12 }}>
                {NODE_CONTENT[popup.node.id].confluentFeature}
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 6 }}>KEY CONFIGS</div>
            <div style={{ 
              backgroundColor: COLORS.bg, 
              borderRadius: 4, 
              padding: 8,
              fontFamily: 'monospace',
              fontSize: 11,
              color: popup.node.confluentOnly ? COLORS.confluentLight : COLORS.success
            }}>
              {NODE_CONTENT[popup.node.id]?.configs.map((cfg, i) => (
                <div key={i}>{cfg}</div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleAction(popup.node.id)}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: popup.node.confluentOnly ? COLORS.confluent : (COLORS.node[popup.node.type] || COLORS.primary),
                color: 'white',
                border: 'none',
                borderRadius: 4,
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              {NODE_CONTENT[popup.node.id]?.action}
            </button>
            <button
              onClick={() => setPopup(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: COLORS.border,
                color: COLORS.text,
                border: 'none',
                borderRadius: 4,
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
          </div>
        );
      })()}
    </div>
  );
};

export default KafkaFlowDemo;