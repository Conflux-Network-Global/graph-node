use crate::prelude::*;

#[derive(Clone, Copy, Debug)]
pub enum SubgraphVersionSwitchingMode {
    Instant,
    Synced,
}

impl SubgraphVersionSwitchingMode {
    pub fn parse(mode: &str) -> Self {
        match mode.to_ascii_lowercase().as_str() {
            "instant" => SubgraphVersionSwitchingMode::Instant,
            "synced" => SubgraphVersionSwitchingMode::Synced,
            _ => panic!("invalid version switching mode: {:?}", mode),
        }
    }
}

/// Common trait for named subgraph providers.
pub trait SubgraphRegistrar: Send + Sync + 'static {
    fn create_subgraph(
        &self,
        name: SubgraphName,
    ) -> Box<dyn Future<Item = CreateSubgraphResult, Error = SubgraphRegistrarError> + Send + 'static>;

    fn create_subgraph_version(
        &self,
        name: SubgraphName,
        hash: SubgraphDeploymentId,
        assignment_node_id: NodeId,
    ) -> Box<dyn Future<Item = (), Error = SubgraphRegistrarError> + Send + 'static>;

    fn remove_subgraph(
        &self,
        name: SubgraphName,
    ) -> Box<dyn Future<Item = (), Error = SubgraphRegistrarError> + Send + 'static>;

    fn reassign_subgraph(
        &self,
        hash: SubgraphDeploymentId,
        node_id: NodeId,
    ) -> Box<dyn Future<Item = (), Error = SubgraphRegistrarError> + Send + 'static>;

    fn update_subgraph_price(
        &self,
        hash: SubgraphDeploymentId,
        price: u64
    ) -> Box<dyn Future<Item = (), Error = SubgraphRegistrarError> + Send + 'static>;

    fn update_all_prices(
        &self,
        price: f32
    ) -> Box<dyn Future<Item = (), Error = SubgraphRegistrarError> + Send + 'static>;
}
