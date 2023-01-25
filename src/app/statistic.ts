export class Score {
  score: number;
  name: string;
  perClassScore: Array<number>;
  macroAverage: number;
  macroWeightedAverage: number;
  microAverage: number;
  constructor(setting: {
    name: string;
    score?: number;
    perClassScore?: Array<number>;
    macroWeightedAverage?: number;
    macroAverage?: number;
    microAverage?: number;
  })
  {
    this.name = setting.name;
    if (setting.score != undefined) this.score = setting.score;
    if (setting.perClassScore) this.perClassScore = setting.perClassScore;
    if (setting.macroAverage != undefined)
      this.macroAverage = setting.macroAverage;
    if (setting.macroWeightedAverage != undefined)
      this.macroWeightedAverage = setting.macroWeightedAverage;
    if (setting.microAverage != undefined)
      this.microAverage = setting.microAverage;
  }
  update(other:{score?:number, perClassScore?:Array<number>; macroAverage?:number, microAverage?:number, macroWeightedAverage?:number}){
    if (other.score != undefined) this.score = other.score;
    if (other.perClassScore) this.perClassScore = other.perClassScore;
    if (other.macroAverage != undefined)
      this.macroAverage = other.macroAverage;
    if (other.microAverage != undefined)
      this.microAverage = other.microAverage;
    if (other.macroWeightedAverage != undefined)
      this.macroWeightedAverage = other.macroWeightedAverage;
  }
  format(){
    return {score:this.score, perClassScore:this.perClassScore, macroAverage:this.macroAverage, microAverage:this.microAverage, macroWeightedAverage:this.macroWeightedAverage}
  }
}

export class Stats {
  cm: Array<Array<number>>;
  n_classes: number;
  sumRows: Array<number>;
  sumCols: Array<number>;
  union: Array<number>;
  diagValues: Array<number>;
  S: number;
  private filteredIndicesFromAvg: Array<number>

  constructor(
    confMat: Array<Array<number>>,
    ignoreFirstClassFromAverage: boolean = true
  ) {
    this.cm = confMat;
    this.n_classes = confMat.length;

    this.diagValues = new Array<number>(this.n_classes);
    this.union = new Array<number>(this.n_classes);

    this.sumCols = this.cm.map((r) => r.reduce((a, b) => a + b));
    this.sumRows = this.cm.reduce((a, b) => a.map((x, i) => x + b[i]));
    this.S = this.sumRows.reduce((a, b) => a + b);

    this.filteredIndicesFromAvg = new Array<number>()
    if(ignoreFirstClassFromAverage) this.filteredIndicesFromAvg.push(0)
    for (let i = 0; i < this.n_classes; i++) {
      this.diagValues[i] = this.cm[i][i];
      this.union[i] = this.sumCols[i] + this.sumRows[i] - this.diagValues[i];

      if(this.sumCols[i]==0 && this.sumRows[i]==0){
        this.filteredIndicesFromAvg.push(i)
      }


    }

  }

  static getStats(
    P: number,
    N: number,
    TP: number,
    TN: number,
    FP: number,
    FN: number
  ): Map<string, number> {
    var statistics = new Map<string, number>();
    statistics.set('Accuracy', (TP+TN) / (P + N + 0.001));
    statistics.set('Overall Acc', 0.0);
    statistics.set('Precision', TP / (TP + FP + 0.001));
    statistics.set('Sensitivity', TP / (P + 0.001));
    statistics.set('Specificity', TN / (N + 0.001));
    statistics.set('Dice', (2 * TP) / (2 * TP + FP + (P - TP) + 0.001));
    statistics.set('F1', (2 * TP) / (2 * TP + FP + FN + 0.001));
    statistics.set('MCC', (TP * TN - FP * FN) / Math.sqrt((TP + FP) * (TP + FN) * (TN + FP) * (TN + FN)));
    statistics.set('Overlap Score', 0.0);
    statistics.set('CSI', TP / (TP + FN + FP + 0.001))
    //statistics.set('FPR', FP / (FP + TN + 0.001))
    return statistics;
  }
  getBinaryClassStats(): Map<string, number> {
    let N = this.sumRows[0];
    let P = this.sumRows[1];
    let TP = this.cm[1][1];
    let TN = this.cm[0][0];
    let FP = N - TN;
    let FN = (TN + FP) - (P+N);
    var statistics = Stats.getStats(P, N, TP, TN, FP, FN);
    statistics.set('Kappa', this.cohenKappa());
    statistics.set('IoU', TP / (P + FP));
    return statistics;
  }

  getMultiClassStats(): Map<string, Array<number>> {
    var statistics = new Map();
    statistics.set('IoU', new Array<number>());
    statistics.set('TP', new Array<number>());
    statistics.set('TN', new Array<number>());
    statistics.set('P', new Array<number>());
    statistics.set('N', new Array<number>());
    statistics.set('FP', new Array<number>());
    statistics.set('FN', new Array<number>());


    for (let i = 0; i < this.n_classes; i++) {
      let P = this.sumRows[i];
      let N = this.S - P;

      let TP = this.diagValues[i];
      let TN = this.S - this.union[i];
      let FP = this.sumCols[i] - this.diagValues[i];
      let FN = this.sumRows[i] - this.diagValues[i];
      let stats = Stats.getStats(P, N, TP, TN, FP, FN);
      for (const [key, value] of stats) {
        if (!statistics.has(key)) statistics.set(key, new Array<number>());
        statistics.get(key).push(value);
      }
      statistics.get('IoU').push(TP / (this.union[i] + 1));
      if(!(this.filteredIndicesFromAvg.includes(i))){
        statistics.get('TP').push(TP);
        statistics.get('TN').push(TN);
        statistics.get('P').push(P);
        statistics.get('N').push(N);
        statistics.get('FP').push(FP);
        statistics.get('FN').push(FN);
      }
    }
    return statistics;
  }

  updateScore(overlap_score: number[], overall_acc : number[], micro_acc : number): Array<Score> {
    let scores = new Array<Score>();
    if (this.n_classes == 2) {
      let stats = this.getBinaryClassStats();
      for (const [key, value] of stats) {
        scores.push(new Score({name: key, score: value}));
      }
    } else {
      let stats = this.getMultiClassStats();

      let microStats = Stats.getMicroAverageScore(stats);

      //calculates weights for each class
      var class_weights = Array(this.cm[0].length).fill(0);
      this.cm.forEach(row => row.forEach((val, index) => class_weights[index] += val));
      let total_instances = 0;
      for (let i = 0; i < this.cm.length; i++) {
        total_instances += class_weights[i];
      }

      let keys = Array.from(microStats.keys());
      for (const [key, value] of stats) {
        var avgValues = new Array<number>();
        var avgWeightedValues = new Array<number>();
        for (let i = 0; i < value.length; i++) {
          if (!(this.filteredIndicesFromAvg.includes(i)))
            avgValues.push(value[i])

        }
        if (key == "Accuracy" || key == "Precision" || key == "Sensitivity") {
          for (let i = 0; i < value.length; i++) {
            if (!(this.filteredIndicesFromAvg.includes(i)))
              avgWeightedValues.push(value[i] * class_weights[i] / total_instances);
          }
        }

        if (key == 'Overlap Score') {
          let args = {
            name: key,
            perClassScore: overlap_score,
            microAverage: 0.0,
            macroAverage: Stats.getMacroAverage(overlap_score),
            macroWeightedAverage: 0.0,
          };
          scores.push(new Score(args));
        }

        if (key == 'Overall Acc') {
          var avgWeightedValues = new Array<number>();
          for (let i = 0; i < overall_acc.length; i++) {
            if (!(this.filteredIndicesFromAvg.includes(i)))
              avgWeightedValues.push(overall_acc[i] * class_weights[i] / total_instances);
          }

          let args = {
            name: key,
            perClassScore: overall_acc,
            microAverage: micro_acc,
            macroAverage: Stats.getMacroAverage(overall_acc),
            macroWeightedAverage: Stats.getMacroWeightedAverage(avgWeightedValues),
          };
          scores.push(new Score(args));
        }

        if (keys.includes(key) && key != 'Overlap Score' && key != 'Overall Acc') {


          let args = {
            name: key,
            perClassScore: value,
            microAverage: microStats.get(key),
            macroAverage: Stats.getMacroAverage(avgValues),
            macroWeightedAverage: Stats.getMacroWeightedAverage(avgWeightedValues),
          };
          scores.push(new Score(args));
        }
        if (key == 'IoU') {
          let arg = {
            name: key,
            perClassScore: value,
            macroAverage: Stats.getMacroAverage(avgValues),
          };
          let s = new Score(arg);
          scores.push(s);
        }
      }
      scores.push(new Score({name: 'Kappa', score: this.cohenKappa()}));
    }
    return scores;
  }

  //TODO: will be tested and deleted
  updateMultiScore(overlap_score: number[]): Array<Score> {
    let scores = new Array<Score>();
    if (this.n_classes == 2) {
      let stats = this.getBinaryClassStats();
      for (const [key, value] of stats) {
        scores.push(new Score({ name: key, score: value }));
      }
    } else {
      let stats = this.getMultiClassStats();

      let microStats = Stats.getMicroAverageScore(stats);


      //calculates weights for each class
      var class_weights = Array(this.cm[0].length).fill(0);
      this.cm.forEach(row => row.forEach((val, index) => class_weights[index] += val));
      let total_instances = 0;
      for (let i = 0; i < this.cm.length; i++) {
        total_instances += class_weights[i];
      }

      let keys = Array.from(microStats.keys());
      for (const [key, value] of stats) {
        var avgValues = new Array<number>();
        var avgWeightedValues = new Array<number>();
        for(let i=0; i<value.length; i++){
          if(!(this.filteredIndicesFromAvg.includes(i)))
            avgValues.push(value[i])

        }
        if(key == "Accuracy" || key == "Precision" || key == "Sensitivity") {
          for (let i = 0; i < value.length; i++) {
            if (!(this.filteredIndicesFromAvg.includes(i)))
              avgWeightedValues.push(value[i] * class_weights[i] / total_instances);
          }
        }

        if (key == 'Overlap') {
          let args = {
            name: key,
            perClassScore: overlap_score,
            microAverage: 0.0,
            macroAverage: Stats.getMacroAverage(overlap_score),
            macroWeightedAverage: 0.0,
          };
          scores.push(new Score(args));
        }

        if (keys.includes(key) && key != 'Overlap Score') {

          let args = {
            name: key,
            perClassScore: value,
            microAverage: microStats.get(key),
            macroAverage: Stats.getMacroAverage(avgValues),
            macroWeightedAverage: Stats.getMacroWeightedAverage(avgWeightedValues),
          };
          scores.push(new Score(args));
        }
        if (key == 'IoU') {
          let arg = {
            name: key,
            perClassScore: value
          };
          let s = new Score(arg);
          scores.push(s);
        }
      }
      scores.push(new Score({ name: 'Kappa', score: this.cohenKappa() }));
    }
    return scores;
  }



  static getMicroAverageScore(
    samples: Map<string, Array<number>>
  ): Map<string, number> {
    let TP = samples.get('TP')?.reduce((a, b) => a + b) || 0;
    let FP = samples.get('FP')?.reduce((a, b) => a + b) || 0;
    let FN = samples.get('FN')?.reduce((a, b) => a + b) || 0;
    let TN = samples.get('TN')?.reduce((a, b) => a + b) || 0;
    let P = samples.get('P')?.reduce((a, b) => a + b) || 0;
    let N = samples.get('N')?.reduce((a, b) => a + b) || 0;
    return Stats.getStats(P, N, TP, TN, FP, FN);
  }

  static getMacroAverage(array: Array<number>) {
    return array.reduce((a, b) => a + b) / array.length;
  }

  static getMacroWeightedAverage(array: Array<number>) {
    if(array.length > 0) {
      return array.reduce((a, b) => a + b);
    }
    return 0;
  }

  cohenKappa(quadratic: boolean = false): number {
    console.log('in cohenKappa');
    let probAgree: number = this.diagValues.reduce((a, b) => a + b) / this.S;
    let probsRandAgree = new Array<number>(this.n_classes);
    for (let i = 0; i < this.n_classes; i++) {
      probsRandAgree[i] =
        (this.sumRows[i] * this.sumCols[i]) / (this.S * this.S);
    }
    let probRandom = probsRandAgree.reduce((a, b) => a + b);
    return (probAgree - probRandom) / (1 - probRandom);
  }

   //overlap score calculation
   static segmentArray(array: number[]) {

    let segments: any[] = [];
    let currentSegment: any[] = [array[0]];

    for (let i = 1; i < array.length; i++) {
      if (array[i] === array[i - 1]) {
        currentSegment.push(array[i]);
      } else {
        segments.push(currentSegment);
        currentSegment = [array[i]];
      }
    }
    segments.push(currentSegment);
    return segments;
  }

  //unused method
  static fillMatrix(segPredArray: any[][], segmentArr: any[], predArray: any[], startIdx: number) {
    segPredArray[1] = predArray;
    segPredArray[0].splice(startIdx, segmentArr.length, ...segmentArr);
  }

  static segmentTraversal(segPredArray: any[][], class_: any, tmpArray: any[][], j: number, segment: any[]) {
    let maxScore = 0;
    for (let i = j; i < j + segment.length; i++) {
      if (segPredArray[0][i] == class_ && tmpArray[0][i] != 12) {
          tmpArray[0][i] = 12;
      }
    }
    let count_tmp_labels = tmpArray[0].filter((val) => val == 12).length;

    if (count_tmp_labels == segment.length) {
      maxScore = this.calculateScore(tmpArray, segPredArray[1], class_);

    }


    return maxScore;
  }

   static calculateScore(arr: any[][], predictionArray: any[], classType: any) {
    let maxScore = 0;
    const groundTruthLen = arr[0].filter(val => val == 12).length;
    let predLen = 0;
    let intersection = 0;
    for (let i = 0; i < arr[0].length; i++) {
      if (predictionArray[i] == classType) {
        arr[1][i] = 12;
      }
    }

    //console.log('to check array in calculateScore');
    //console.log(arr[1]);
    //console.log('class -> '+classType);
    for (let i = 0; i < arr[0].length; i++) {
      if (arr[1][i] != 12) {
        intersection = 0;
        predLen = 0;
      }
      predLen = this.calculatePredUnion(arr[1], i, predLen);
      if (arr[0][i] == arr[1][i] && arr[0][i] == 12) {
        intersection += 1;
        let union = groundTruthLen + predLen - intersection;
        let overlapScore = intersection / union;
        //console.log('overlap score');
        //console.log(overlapScore);
        maxScore = Math.max(maxScore, overlapScore);
      }
    }
    //console.log(maxScore);
    return maxScore;
  }

  static calculatePredUnion(pred: any[], predIdx: number, length: number) {
    let union = length;
    if (union === 0) {
      while (predIdx < pred.length) {
        if (pred[predIdx] != 12) {
          if (union !== 0) {
            return union;
          }
          union = 0;
        } else {
          union += 1;
        }
        predIdx += 1;
      }
    }
    return union;
  }


  static calculateOverlap(groundTruth: Array<number>, prediction: Array<number>) {
    let groundTruthSegments = this.segmentArray(groundTruth);
    let i = 1; // ROW
    let j = 0;
    let final_result = [];

    for(let segment of groundTruthSegments) {
      let class_type = segment[0]; //to check class type
      let max_score = 0; // each segment

      let seg_pred_arr = Array(2).fill(null).map(() => Array(prediction.length).fill(null));
      let tmp_arr = Array(2).fill(null).map(() => Array(prediction.length).fill(null));

      //this.fillMatrix(seg_pred_arr, segment, prediction, j);
      seg_pred_arr[1] = prediction;
      seg_pred_arr[0].splice(j, segment.length, ...segment);
      //console.log('after fill matrix');
      //console.log(seg_pred_arr);

      let score = this.segmentTraversal(seg_pred_arr, class_type, tmp_arr, j, segment);
      final_result.push(score);

      j += segment.length;

    }
    //console.log('overlap calculate');
    //console.log(final_result);
    //let final = final_result.reduce((a, b) => a + b, 0) / final_result.length;
    //console.log(final);
    //return Number(final.toFixed(4));
    return final_result;

  }

  static getUniqueNumbers(numbers: number[]): number[] {
    return Array.from(new Set(numbers));
  }

  static overall_acc(yTrue: any[], yPred: any[]): number[] {
    const classLabels = this.getUniqueNumbers(yTrue);
    const classAccuracies = new Array(classLabels.length).fill(0);
    const classCounts = new Array(classLabels.length).fill(0);

    for(let i = 0; i < yTrue.length; i++) {
      const classIndex = classLabels.indexOf(yTrue[i]);
      classCounts[classIndex]++;
      if(yTrue[i] == yPred[i]) {
        classAccuracies[classIndex]++;
      }
    }

    for(let i = 0; i < classAccuracies.length; i++) {
      classAccuracies[i] /= classCounts[i];
    }

    return classAccuracies;
  }

  static micro_overall_acc(yTrue: any[], yPred: any[]): number {
    let correctPredictions = 0;

    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === yPred[i]) {
        correctPredictions++;
      }
    }

    return correctPredictions / yTrue.length;
  }


}


