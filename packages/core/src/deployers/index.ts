export { registerDeployer, getDeployer, listDeployers, listTargets, hasDeployer } from "./registry.js";
export { mapGuardToCloudConfig, describeGuardMapping } from "./guard-mapper.js";
export { generateServerPy } from "./api-wrapper.js";
export { generateStreamlitApp } from "./streamlit-app.js";
export { generatePipelinePy } from "./pipeline.js";

import { registerDeployer } from "./registry.js";
import { dockerAdapter } from "./docker.js";
import { flyIoAdapter } from "./fly-io.js";
import { railwayAdapter } from "./railway.js";
import { gcpCloudRunAdapter } from "./gcp-cloud-run.js";
import { awsLambdaAdapter } from "./aws-lambda.js";

registerDeployer(dockerAdapter);
registerDeployer(flyIoAdapter);
registerDeployer(railwayAdapter);
registerDeployer(gcpCloudRunAdapter);
registerDeployer(awsLambdaAdapter);
